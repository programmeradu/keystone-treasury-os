import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET must be configured');
    return new TextEncoder().encode(secret);
}

async function getSiwsPayload(request: NextRequest): Promise<Record<string, unknown> | null> {
    const token = request.cookies.get(SIWS_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getJwtSecret(), { issuer: 'keystone-treasury-os' });
        return payload as Record<string, unknown>;
    } catch {
        return null;
    }
}

/** Aligns with robots.txt — HTML/API responses for app-like routes should not be indexed. */
function isPrivateSeoPath(pathname: string): boolean {
    if (pathname === '/hello' || pathname.startsWith('/hello/')) return true;
    if (pathname === '/working-swap' || pathname.startsWith('/working-swap/')) return true;
    return (
        pathname.startsWith('/app') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/github-cleanup') ||
        pathname.startsWith('/mobile')
    );
}

function withSeoHeaders(response: NextResponse, pathname: string): NextResponse {
    if (isPrivateSeoPath(pathname)) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    }
    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Handle Neon Auth OAuth verifier exchange ────────────────────
    // After Google/Discord OAuth, Neon Auth redirects back with
    // ?neon_auth_session_verifier=xxx appended to the callbackURL.
    // Strip it and ensure the user lands on /auth?oauth=complete so the
    // client-side exchange flow can create a local JWT session.
    if (request.nextUrl.searchParams.has('neon_auth_session_verifier')) {
        // Build the redirect URL using the real origin (handles CF Workers
        // where request.nextUrl.clone() can produce http://localhost).
        const origin =
            request.headers.get('x-forwarded-host')
                ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
                : request.nextUrl.origin;
        const cleanUrl = new URL(request.nextUrl.pathname, origin);
        // Copy over existing params except the verifier
        request.nextUrl.searchParams.forEach((value, key) => {
            if (key !== 'neon_auth_session_verifier') {
                cleanUrl.searchParams.set(key, value);
            }
        });
        // Ensure oauth=complete is present (it should be from callbackURL)
        if (!cleanUrl.searchParams.has('oauth')) {
            cleanUrl.searchParams.set('oauth', 'complete');
        }
        console.log('[Middleware] Stripping neon_auth_session_verifier, redirecting to:', cleanUrl.pathname + cleanUrl.search);
        return withSeoHeaders(NextResponse.redirect(cleanUrl), pathname);
    }

    // ─── Skip public routes ─────────────────────────────────────────
    const publicPaths = [
        '/api/auth',
        '/api/health',
        '/_next',
        '/favicon',
        '/images',
        '/fonts',
        '/manifest',
    ];

    const publicPages = ['/', '/marketplace', '/pricing', '/atlas', '/docs', '/about', '/auth'];

    if (
        publicPaths.some((p) => pathname.startsWith(p)) ||
        publicPages.includes(pathname) ||
        pathname.startsWith('/legal') ||
        pathname.startsWith('/guides') ||
        pathname.includes('.')
    ) {
        return withSeoHeaders(NextResponse.next(), pathname);
    }

    // ─── Check both auth systems in parallel ────────────────────────
    const [siwsPayload, hasNeon] = await Promise.all([
        getSiwsPayload(request),
        Promise.resolve(hasNeonAuthSession(request)),
    ]);

    const hasSiws = !!siwsPayload;
    const isAuthenticated = hasSiws || hasNeon;

    // ─── Public API routes (no auth required) ───────────────────────
    const publicApiPaths = ['/api/studio/marketplace'];
    if (publicApiPaths.some((p) => pathname === p || (pathname.startsWith(p) && request.method === 'GET'))) {
        return withSeoHeaders(
            NextResponse.next({ request: { headers: request.headers } }),
            pathname,
        );
    }

    // ─── CLI publish endpoints (self-authenticated, no cookies needed) ──
    // /api/studio/publish/auth   — GET, returns challenge nonce (public)
    // /api/studio/publish/register — POST, registers developer (rate-limited, self-protected)
    // /api/studio/publish        — POST with bearer/signature headers (route does own auth)
    if (pathname === '/api/studio/publish/auth' || pathname === '/api/studio/publish/register') {
        return withSeoHeaders(
            NextResponse.next({ request: { headers: request.headers } }),
            pathname,
        );
    }

    // ─── CLI auth bypass: let bearer-token / wallet-signature requests through ──
    // The publish route handler does its own verification of these credentials.
    if (
        (pathname === '/api/studio/publish' || pathname.startsWith('/api/studio/publish/')) &&
        (request.headers.has('authorization') || request.headers.has('x-keystone-signature'))
    ) {
        return withSeoHeaders(
            NextResponse.next({ request: { headers: request.headers } }),
            pathname,
        );
    }

    // ─── Protect /app/* and /api/* routes ───────────────────────────
    const protectedPaths = ['/app', '/api/studio', '/api/agent', '/api/dca'];

    if (protectedPaths.some((p) => pathname.startsWith(p)) && !isAuthenticated) {
        if (pathname.startsWith('/api/')) {
            return withSeoHeaders(
                NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 }),
                pathname,
            );
        }

        // Use the real origin (CF Workers can make nextUrl.clone() return localhost)
        const origin =
            request.headers.get('x-forwarded-host')
                ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
                : request.nextUrl.origin;
        const url = new URL('/auth', origin);
        // Preserve the intended destination so auth page can redirect back
        if (pathname !== '/app') {
            url.searchParams.set('redirect', pathname);
        }
        return withSeoHeaders(NextResponse.redirect(url), pathname);
    }

    // ─── Admin Role Gate ────────────────────────────────────────────
    if (pathname.startsWith('/app/admin')) {
        if (!isAuthenticated) {
            const url = request.nextUrl.clone();
            url.pathname = '/auth';
            return withSeoHeaders(NextResponse.redirect(url), pathname);
        }
    }

    // ─── Onboarding redirect for authenticated but un-onboarded users ──
    if (
        isAuthenticated &&
        pathname.startsWith('/app') &&
        !pathname.startsWith('/app/onboarding') &&
        !pathname.startsWith('/api/') &&
        siwsPayload &&
        siwsPayload.onboarded === false
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/app/onboarding';
        return withSeoHeaders(NextResponse.redirect(url), pathname);
    }

    return withSeoHeaders(
        NextResponse.next({ request: { headers: request.headers } }),
        pathname,
    );
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
