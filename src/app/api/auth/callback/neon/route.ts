import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
    const { origin } = new URL(request.url);

    try {
        const { data, error } = await auth.getSession();

        if (error || !data?.session || !data?.user) {
            console.error('[Neon Auth Callback] Session get error or missing session/user:', error);
            return NextResponse.redirect(`${origin}/auth?error=neon_auth_failed`);
        }

        if (!db) {
            console.error('[Neon Auth Callback] Database connection not established');
            return NextResponse.redirect(`${origin}/auth?error=database_error`);
        }

        const user = data.user;
        const neonUserId = user.id;

        // Check if user exists in public.users
        const existing = await db
            .select()
            .from(users)
            .where(eq(users.supabaseUserId, neonUserId))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(users).values({
                walletAddress: `neon_${neonUserId}`, // placeholder
                supabaseUserId: neonUserId,
                displayName: user.name || user.email?.split('@')[0] || 'User',
                role: 'user',
            });
        } else {
            await db.update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.supabaseUserId, neonUserId));
        }

        return NextResponse.redirect(`${origin}/app`);
    } catch (err: any) {
        console.error('[Neon Auth Callback] Error:', err);
        return NextResponse.redirect(`${origin}/auth?error=neon_auth_failed`);
    }
}
