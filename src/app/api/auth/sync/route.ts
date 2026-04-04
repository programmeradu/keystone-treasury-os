import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';
import { auth } from '@/lib/auth/server';

export async function POST(req: NextRequest) {
    try {
        const siwsUser = await getAuthUser(req);
        const { data: neonData } = await auth.getSession();

        if (!siwsUser && !neonData?.user) {
            return NextResponse.json({ synced: false, reason: 'unauthorized' }, { status: 401 });
        }

        if (!db) {
            return NextResponse.json({ synced: false, error: 'db_unavailable' }, { status: 500 });
        }

        // Logic for SIWS identity (Solana)
        if (siwsUser) {
            const [existing] = await db
                .select()
                .from(users)
                .where(eq(users.id, siwsUser.id))
                .limit(1);

            if (!existing) {
                await db.insert(users).values({
                    walletAddress: siwsUser.walletAddress,
                    displayName: (siwsUser as any).displayName || siwsUser.walletAddress.slice(0, 6),
                    role: 'user',
                });
            } else {
                await db.update(users)
                    .set({ lastLoginAt: new Date() })
                    .where(eq(users.id, siwsUser.id));
            }
            return NextResponse.json({ synced: true, provider: 'siws' });
        }

        // Fallback or parallel logic for Neon Auth identity
        if (neonData?.user) {
            const neonUser = neonData.user;
            const [existing] = await db
                .select()
                .from(users)
                .where(eq(users.supabaseUserId, neonUser.id))
                .limit(1);

            if (!existing) {
                await db.insert(users).values({
                    walletAddress: `neon_${neonUser.id}`,
                    supabaseUserId: neonUser.id,
                    displayName: neonUser.name || neonUser.email?.split('@')[0] || 'User',
                    role: 'user',
                });
            } else {
                await db.update(users)
                    .set({ lastLoginAt: new Date() })
                    .where(eq(users.supabaseUserId, neonUser.id));
            }
            return NextResponse.json({ synced: true, provider: 'neon' });
        }

        return NextResponse.json({ synced: false }, { status: 401 });
    } catch (err) {
        console.error('[Auth Sync] Error:', err);
        return NextResponse.json({ synced: false }, { status: 500 });
    }
}
