import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'keystone-siws-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET must be configured');
    return new TextEncoder().encode(secret);
}

/**
 * POST /api/auth/refresh-session
 * Re-reads the user's current state from DB and re-issues the JWT cookie
 * with updated flags (e.g. onboarded: true after onboarding completion).
 * Requires an existing valid SIWS session.
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get(COOKIE_NAME)?.value;
        if (!token) {
            return NextResponse.json({ error: 'No session' }, { status: 401 });
        }

        // Verify existing JWT
        const { payload } = await jwtVerify(token, getJwtSecret(), {
            issuer: 'keystone-treasury-os',
        });

        const wallet = payload.wallet as string;
        const userId = payload.sub as string;

        if (!wallet || !db) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        // Re-read user from DB to get fresh flags
        const [user] = await db
            .select({ onboardingCompleted: users.onboardingCompleted })
            .from(users)
            .where(eq(users.walletAddress, wallet))
            .limit(1);

        // Issue fresh JWT with updated onboarded flag
        const newToken = await new SignJWT({
            sub: userId,
            wallet,
            method: 'siws',
            onboarded: user?.onboardingCompleted ?? false,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(`${SESSION_MAX_AGE}s`)
            .setIssuer('keystone-treasury-os')
            .sign(getJwtSecret());

        const response = NextResponse.json({ success: true, onboarded: user?.onboardingCompleted ?? false });

        response.cookies.set(COOKIE_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE,
        });

        return response;
    } catch (err) {
        console.error('[refresh-session] Error:', err);
        return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 });
    }
}
