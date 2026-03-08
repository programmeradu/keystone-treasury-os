import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { auth } from '@/lib/auth/server';

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

// Use a non-/auth loginUrl here so verifier exchange still runs when callback lands on /auth.
const handleNeonAuth = auth.middleware({ loginUrl: '/auth/sign-in' });

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

async function hasSiwsSession(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(SIWS_COOKIE)?.value;
    if (!token) return false;

    try {
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || 'keystone_sovereign_os_2026'
        );
        await jwtVerify(token, secret, { issuer: 'keystone-treasury-os' });
        return true;
    } catch {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Handle Neon Auth OAuth verifier exchange ────────────────────
    // When returning from Google/Discord OAuth, the URL contains
    // neon_auth_session_verifier which must be exchanged for session cookies
    if (request.nextUrl.searchParams.has('neon_auth_session_verifier')) {
        return handleNeonAuth(request);
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
