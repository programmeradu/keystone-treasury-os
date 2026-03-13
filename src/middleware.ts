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
    const isBuildPhase = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';
    // Cloudflare Pages build environment workaround
    if (!process.env.JWT_SECRET && !isBuildPhase) {
        console.warn('JWT_SECRET environment variable is not set. Using build placeholder. DO NOT USE IN PRODUCTION.');
    }
    const secret = process.env.JWT_SECRET || 'build-placeholder-secret-1234567890';
    return new TextEncoder().encode(secret);
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

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Handle Neon Auth OAuth verifier exchange ────────────────────
    // After Google/Discord OAuth, Neon Auth redirects back with
    // ?neon_auth_session_verifier=xxx appended to the callbackURL.
    // Strip it and ensure the user lands on /auth?oauth=complete so the
    // client-side exchange flow can create a local JWT session.
    if (request.nextUrl.searchParams.has('neon_auth_session_verifier')) {
        const cleanUrl = request.nextUrl.clone();
        // Ensure oauth=complete is present (it should be from callbackURL)
        if (!cleanUrl.searchParams.has('oauth')) {
            cleanUrl.searchParams.set('oauth', 'complete');
        }
        // Remove the verifier param to keep the URL clean
        cleanUrl.searchParams.delete('neon_auth_session_verifier');
        console.log('[Middleware] Stripping neon_auth_session_verifier, redirecting to:', cleanUrl.pathname + cleanUrl.search);
        return NextResponse.redirect(cleanUrl);
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

    // ─── Public API routes (no auth required) ───────────────────────
    const publicApiPaths = ['/api/studio/marketplace'];
    if (publicApiPaths.some((p) => pathname === p || (pathname.startsWith(p) && request.method === 'GET'))) {
        return NextResponse.next({ request: { headers: request.headers } });
    }

    // ─── CLI publish endpoints (self-authenticated, no cookies needed) ──
    // /api/studio/publish/auth   — GET, returns challenge nonce (public)
    // /api/studio/publish/register — POST, registers developer (rate-limited, self-protected)
    // /api/studio/publish        — POST with bearer/signature headers (route does own auth)
    if (pathname === '/api/studio/publish/auth' || pathname === '/api/studio/publish/register') {
        return NextResponse.next({ request: { headers: request.headers } });
    }

    // ─── CLI auth bypass: let bearer-token / wallet-signature requests through ──
    // The publish route handler does its own verification of these credentials.
    if (
        (pathname === '/api/studio/publish' || pathname.startsWith('/api/studio/publish/')) &&
        (request.headers.has('authorization') || request.headers.has('x-keystone-signature'))
    ) {
        return NextResponse.next({ request: { headers: request.headers } });
    }

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
