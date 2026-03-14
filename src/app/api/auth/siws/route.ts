import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'keystone-siws-session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    return new TextEncoder().encode(secret);
}

/**
 * POST /api/auth/siws
 * Sign In With Solana — self-contained JWT session:
 *   1. Verify ed25519 signature (CPU-only, ~5ms)
 *   2. Verify nonce freshness
 *   3. Upsert user in Neon DB
 *   4. Issue signed JWT session cookie
 */
export async function POST(request: NextRequest) {
    try {
        const { message, signature, walletAddress } = await request.json();

        if (!message || !signature || !walletAddress) {
            return NextResponse.json(
                { error: 'Missing message, signature, or walletAddress' },
                { status: 400 }
            );
        }

        // ─── Step 1: Verify ed25519 signature (~5ms, CPU-only) ─────────
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = bs58.decode(signature);
        const publicKeyBytes = bs58.decode(walletAddress);

        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // ─── Step 2: Verify nonce freshness ────────────────────────────
        const timestampMatch = message.match(/Timestamp:\s*(.+)/);
        if (timestampMatch) {
            const messageTime = new Date(timestampMatch[1]).getTime();
            const now = Date.now();
            const FIVE_MINUTES = 5 * 60 * 1000;
            if (Math.abs(now - messageTime) > FIVE_MINUTES) {
                return NextResponse.json(
                    { error: 'Message expired. Please try again.' },
                    { status: 401 }
                );
            }
        }

        // ─── Step 3: Upsert user in Neon DB ────────────────────────────
        let userId: string | undefined;

        if (db) {
            const existing = await db
                .select()
                .from(users)
                .where(eq(users.walletAddress, walletAddress))
                .limit(1);

            if (existing.length === 0) {
                const [inserted] = await db.insert(users).values({
                    walletAddress,
                    role: 'user',
                    displayName: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
                }).returning({ id: users.id });
                userId = inserted?.id;
            } else {
                userId = existing[0].id;
                await db
                    .update(users)
                    .set({ lastLoginAt: new Date() })
                    .where(eq(users.walletAddress, walletAddress));
            }
        }

        // ─── Step 4: Issue signed JWT session cookie ────────────────────
        const token = await new SignJWT({
            sub: userId || walletAddress,
            wallet: walletAddress,
            method: 'siws',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(`${SESSION_MAX_AGE}s`)
            .setIssuer('keystone-treasury-os')
            .sign(getJwtSecret());

        const response = NextResponse.json({
            user: {
                id: userId || walletAddress,
                walletAddress,
                email: `${walletAddress}@keystone.wallet`,
            },
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE,
        });

        return response;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[SIWS] Auth error:', msg);
        return NextResponse.json(
            { error: msg || 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/auth/siws
 * Get current session from JWT cookie.
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get(COOKIE_NAME)?.value;
        if (!token) {
            return NextResponse.json({ user: null });
        }

        const { payload } = await jwtVerify(token, getJwtSecret(), {
            issuer: 'keystone-treasury-os',
        });

        return NextResponse.json({
            user: {
                id: payload.sub,
                walletAddress: payload.wallet as string,
                email: `${payload.wallet}@keystone.wallet`,
            },
        });
    } catch {
        return NextResponse.json({ user: null });
    }
}

/**
 * DELETE /api/auth/siws
 * Sign out — clear session cookie.
 */
export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}
