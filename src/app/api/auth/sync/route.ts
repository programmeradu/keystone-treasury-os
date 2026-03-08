import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/server';

export async function POST() {
    try {
        const { data, error } = await auth.getSession();

        if (error || !data?.session || !data?.user) {
            return NextResponse.json({ synced: false }, { status: 401 });
        }

        if (!db) {
            return NextResponse.json({ synced: false, error: 'db_unavailable' }, { status: 500 });
        }

        const user = data.user;
        const neonUserId = user.id;

        const existing = await db
            .select()
            .from(users)
            .where(eq(users.supabaseUserId, neonUserId))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(users).values({
                walletAddress: `neon_${neonUserId}`,
                supabaseUserId: neonUserId,
                displayName: user.name || user.email?.split('@')[0] || 'User',
                role: 'user',
            });
        } else {
            await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.supabaseUserId, neonUserId));
        }

        return NextResponse.json({ synced: true });
    } catch (err) {
        console.error('[Auth Sync] Error:', err);
        return NextResponse.json({ synced: false }, { status: 500 });
    }
}
