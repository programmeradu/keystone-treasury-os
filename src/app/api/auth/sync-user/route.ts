/**
 * POST /api/auth/sync-user
 *
 * Syncs a Neon Auth (Better Auth) user into the public.users table.
 * Called after Google OAuth login to ensure the user exists in both
 * neon_auth.user AND public.users.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST() {
    try {
        // Get the current Neon Auth session
        const session = await (auth as any).api.getSession({
            headers: await headers(),
        });

        if (!session?.user) {
            return NextResponse.json(
                { error: 'No active Neon Auth session' },
                { status: 401 }
            );
        }

        if (!db) {
            return NextResponse.json(
                { error: 'Database not available' },
                { status: 500 }
            );
        }

        const neonUser = session.user;
        const neonUserId = neonUser.id;
        const email = neonUser.email || '';
        const displayName =
            neonUser.name ||
            email.split('@')[0] ||
            'User';

        // Check if this Neon Auth user already exists in public.users
        const existing = await db
            .select()
            .from(users)
            .where(eq(users.supabaseUserId, neonUserId))
            .limit(1);

        if (existing.length === 0) {
            // Create a new public.users record linked to the Neon Auth user
            await db.insert(users).values({
                walletAddress: `neon_${neonUserId}`, // placeholder until wallet is linked
                supabaseUserId: neonUserId, // reusing this column for Neon Auth ID
                displayName,
                role: 'user',
            });
        } else {
            // Update last login
            await db
                .update(users)
                .set({
                    lastLoginAt: new Date(),
                    displayName,
                })
                .where(eq(users.supabaseUserId, neonUserId));
        }

        return NextResponse.json({
            ok: true,
            user: {
                id: neonUserId,
                email,
                displayName,
            },
        });
    } catch (err: any) {
        console.error('[Sync User] Error:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to sync user' },
            { status: 500 }
        );
    }
}
