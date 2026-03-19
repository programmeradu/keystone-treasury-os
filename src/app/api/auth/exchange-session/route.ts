import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { neon } from '@neondatabase/serverless';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'keystone-siws-session';
const OAUTH_STATE_COOKIE = 'keystone-oauth-state';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'test' || process.env.CI) {
            return new TextEncoder().encode('dummy_secret_for_testing');
        }
        throw new Error('JWT_SECRET environment variable is missing');
    }
    return new TextEncoder().encode(secret);
}

/**
 * GET /api/auth/exchange-session
 *
 * Called before OAuth to set a signed state cookie that proves the user
 * initiated the flow from our app.
 */
export async function GET() {
    const stateToken = await new SignJWT({ purpose: 'oauth-state' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('10m')
        .setIssuer('keystone-treasury-os')
        .sign(getJwtSecret());

    const response = NextResponse.json({ state: 'ready' });
    response.cookies.set(OAUTH_STATE_COOKIE, stateToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600, // 10 minutes
    });
    return response;
}

/**
 * Query Better Auth's database tables directly to find the user who
 * just completed OAuth. Neon Auth stores its users/sessions in the
 * same Neon Postgres database as our app.
 */
async function findOAuthUser(
    initiatedAt: number,
): Promise<{ id: string; email: string; name: string } | null> {
    const url = process.env.DATABASE_URL?.replace(/['"\r\n]/g, '').trim();
    if (!url) return null;

    const sql = neon(url);

    // Try public schema (default Better Auth table names)
    try {
        const rows = await sql`
            SELECT u.id, u.name, u.email
            FROM "user" u
            JOIN "session" s ON s."userId" = u.id
            WHERE EXTRACT(EPOCH FROM s."createdAt") > ${initiatedAt}
            ORDER BY s."createdAt" DESC
            LIMIT 1`;
        if (rows.length > 0 && rows[0].id) {
            return {
                id: rows[0].id as string,
                email: (rows[0].email as string) || '',
                name: (rows[0].name as string) || '',
            };
        }
    } catch { /* table doesn't exist in public schema */ }

    // Try auth schema
    try {
        const rows = await sql`
            SELECT u.id, u.name, u.email
            FROM auth."user" u
            JOIN auth."session" s ON s."userId" = u.id
            WHERE EXTRACT(EPOCH FROM s."createdAt") > ${initiatedAt}
            ORDER BY s."createdAt" DESC
            LIMIT 1`;
        if (rows.length > 0 && rows[0].id) {
            return {
                id: rows[0].id as string,
                email: (rows[0].email as string) || '',
                name: (rows[0].name as string) || '',
            };
        }
    } catch { /* table doesn't exist in auth schema */ }

    // Try neon_auth schema
    try {
        const rows = await sql`
            SELECT u.id, u.name, u.email
            FROM neon_auth."user" u
            JOIN neon_auth."session" s ON s."userId" = u.id
            WHERE EXTRACT(EPOCH FROM s."createdAt") > ${initiatedAt}
            ORDER BY s."createdAt" DESC
            LIMIT 1`;
        if (rows.length > 0 && rows[0].id) {
            return {
                id: rows[0].id as string,
                email: (rows[0].email as string) || '',
                name: (rows[0].name as string) || '',
            };
        }
    } catch { /* table doesn't exist in neon_auth schema */ }

    return null;
}

/**
 * POST /api/auth/exchange-session
 *
 * After Google OAuth completes, the client calls this to create a local
 * JWT session. Uses multiple strategies to identify the authenticated user:
 *   1. Neon Auth get-session via proxy (if cookies are on our domain)
 *   2. Direct query of Better Auth DB tables
 *   3. User info supplied in request body (fallback)
 */
export async function POST(request: NextRequest) {
    try {
        // Verify the OAuth state cookie exists and is valid
        const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
        if (!stateCookie) {
            return NextResponse.json(
                { error: 'No OAuth state found. Please try signing in again.' },
                { status: 403 },
            );
        }

        let initiatedAt: number;
        try {
            const payload = await jwtVerify(stateCookie, getJwtSecret(), {
                issuer: 'keystone-treasury-os',
            });
            initiatedAt = (payload.payload.iat as number) || Math.floor(Date.now() / 1000) - 600;
        } catch {
            return NextResponse.json(
                { error: 'OAuth state expired. Please try signing in again.' },
                { status: 403 },
            );
        }

        let user: { id: string; email: string; name: string } | null = null;

        // ── Strategy 1: Neon Auth get-session via server-to-server call ──
        const base = process.env.NEON_AUTH_BASE_URL;
        if (base && !user) {
            try {
                const cookies = request.headers.get('cookie') || '';
                const res = await fetch(`${base.replace(/\/$/, '')}/get-session`, {
                    headers: { Cookie: cookies, Accept: 'application/json' },
                });
                if (res.ok) {
                    const data = await res.json();
                    const u = data?.user || data?.data?.user;
                    if (u?.id) {
                        user = { id: u.id, email: u.email || '', name: u.name || '' };
                        console.log('[Exchange Session] Strategy 1 (proxy) succeeded');
                    }
                }
            } catch {}
        }

        // ── Strategy 2: Query Better Auth DB tables ─────────────────────
        if (!user) {
            user = await findOAuthUser(initiatedAt);
            if (user) console.log('[Exchange Session] Strategy 2 (database) succeeded');
        }

        // ── Strategy 3: User info from request body ─────────────────────
        if (!user) {
            const body = await request.json().catch(() => ({}));
            if (body.neonUserId || body.email) {
                user = {
                    id: body.neonUserId || body.email,
                    email: body.email || '',
                    name: body.name || '',
                };
                console.log('[Exchange Session] Strategy 3 (body) succeeded');
            }
        }

        if (!user) {
            console.log('[Exchange Session] All strategies failed');
            return NextResponse.json(
                { error: 'Could not identify user. Please try signing in again.' },
                { status: 403 },
            );
        }

        // Upsert user in our app's own users table
        let dbUser = null;
        if (db) {
            const rows = await db
                .select()
                .from(users)
                .where(eq(users.supabaseUserId, user.id))
                .limit(1);
            dbUser = rows[0] || null;

            if (!dbUser) {
                const [newUser] = await db
                    .insert(users)
                    .values({
                        walletAddress: `neon_${user.id}`,
                        supabaseUserId: user.id,
                        displayName: user.name || user.email?.split('@')[0] || 'User',
                        role: 'user',
                    })
                    .returning();
                dbUser = newUser;
            }
        }

        const userId = dbUser?.id || user.id;

        // Create a local JWT session cookie (same as SIWS)
        const token = await new SignJWT({
            sub: userId,
            wallet: dbUser?.walletAddress || `neon_${user.id}`,
            email: user.email || undefined,
            method: 'neon-oauth',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(`${SESSION_MAX_AGE}s`)
            .setIssuer('keystone-treasury-os')
            .sign(getJwtSecret());

        const response = NextResponse.json({
            user: {
                id: userId,
                walletAddress: dbUser?.walletAddress || `neon_${user.id}`,
                email: user.email || `${userId}@keystone.neon`,
            },
        });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE,
        });

        // Clear the OAuth state cookie
        response.cookies.set(OAUTH_STATE_COOKIE, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        });

        return response;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Exchange Session] Error:', msg);
        return NextResponse.json(
            { error: 'Session exchange failed' },
            { status: 500 },
        );
    }
}
