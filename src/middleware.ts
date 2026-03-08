import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

/**
 * Middleware: Dual auth session check + route protection.
 *
 * Supports TWO authentication systems:
 *   1. SIWS (Sign In With Solana) – signed JWT cookie
 *   2. Neon Auth (Better Auth)    – social sign-in (Google, Discord)
 *
 * - Public: /api/auth/*, /, /marketplace, /pricing, static assets
 * - Protected: /app/*, /api/studio/*, /api/agent/*
 */

const SIWS_COOKIE = 'keystone-siws-session';

const NEON_AUTH_COOKIE_NAMES = [
    '__Secure-neon-auth.session_token',
    'neon-auth.session_token',
    '__Secure-neon-auth.local.session_data',
    'neon-auth.local.session_data',
    'better-auth.session_token',
];

function hasNeonAuthSession(request: NextRequest): boolean {
    return NEON_AUTH_COOKIE_NAMES.some((name) => {
        const cookie = request.cookies.get(name);
        return cookie && cookie.value.length > 0;
    });
}

function getJwtSecret() {
    return new TextEncoder().encode(
        process.env.JWT_SECRET || 'keystone_sovereign_os_2026'
    );
}

async function hasSiwsSession(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(SIWS_COOKIE)?.value;
    if (!token) return false;

    try {
        await jwtVerify(token, getJwtSecret(), { issuer: 'keystone-treasury-os' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Try to exchange a Neon Auth session verifier for a local JWT session.
 * The verifier is appended to the callbackURL by Neon Auth after
 * successful OAuth. We use it as a session token to call Neon Auth's
 * get-session endpoint and retrieve the authenticated user info.
 */
async function exchangeVerifier(
    verifier: string,
): Promise<{ userId: string; email?: string; name?: string } | null> {
    const base = process.env.NEON_AUTH_BASE_URL;
    if (!base) return null;

    try {
        // Try using the verifier as a session token – Neon Auth may
        // accept it via any of these cookie names.
        const cookieStr = [
            `__Secure-neon-auth.session_token=${verifier}`,
            `neon-auth.session_token=${verifier}`,
            `better-auth.session_token=${verifier}`,
        ].join('; ');

        const res = await fetch(`${base.replace(/\/$/, '')}/get-session`, {
            headers: { Cookie: cookieStr, Accept: 'application/json' },
        });

        if (res.ok) {
            const data = await res.json();
            const user = data?.user || data?.data?.user;
            if (user?.id) {
                return { userId: user.id, email: user.email, name: user.name };
            }
        }
    } catch (err) {
        console.error('[Middleware] Verifier exchange error:', err);
    }

    return null;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Handle Neon Auth OAuth verifier exchange ────────────────────
    // When returning from Google/Discord OAuth, the URL may contain
    // neon_auth_session_verifier which we exchange for a local JWT.
    if (request.nextUrl.searchParams.has('neon_auth_session_verifier')) {
        const verifier = request.nextUrl.searchParams.get('neon_auth_session_verifier')!;
        console.log('[Middleware] Exchanging neon_auth_session_verifier…');

        const session = await exchangeVerifier(verifier);
        if (session) {
            const token = await new SignJWT({
                sub: session.userId,
                wallet: `neon_${session.userId}`,
                email: session.email,
                method: 'neon-oauth',
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('7d')
                .setIssuer('keystone-treasury-os')
                .sign(getJwtSecret());

            // Redirect to /app with a clean URL and the new session cookie.
            const appUrl = request.nextUrl.clone();
            appUrl.pathname = '/app';
            appUrl.search = '';

            const response = NextResponse.redirect(appUrl);
            response.cookies.set(SIWS_COOKIE, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            });
            console.log('[Middleware] Verifier exchanged – redirecting to /app');
            return response;
        }

        console.log('[Middleware] Verifier exchange failed – falling through');
        // Fall through to let the auth page handle it via the exchange-session endpoint.
        return NextResponse.next();
    }

    // ─── Skip public routes ─────────────────────────────────────────
    const publicPaths = [
        '/api/auth',
        '/api/health',
        '/_next',
        '/favicon',
        '/images',
        '/fonts',
    ];

    const publicPages = ['/', '/marketplace', '/pricing', '/docs', '/about', '/auth'];

    if (
        publicPaths.some((p) => pathname.startsWith(p)) ||
        publicPages.includes(pathname) ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // ─── Check both auth systems in parallel ────────────────────────
    const [hasSiws, hasNeon] = await Promise.all([
        hasSiwsSession(request),
        Promise.resolve(hasNeonAuthSession(request)),
    ]);

    const isAuthenticated = hasSiws || hasNeon;

    // ─── Protect /app/* and /api/* routes ───────────────────────────
    const protectedPaths = ['/app', '/api/studio', '/api/agent', '/api/dca'];

    if (protectedPaths.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Unauthorized. Please sign in.' },
                { status: 401 }
            );
        }

        const url = request.nextUrl.clone();
        url.pathname = '/auth';
        return NextResponse.redirect(url);
    }

    return NextResponse.next({ request: { headers: request.headers } });
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
