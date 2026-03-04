import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware: Supabase session refresh + route protection.
 *
 * - Public: /api/auth/*, /, /marketplace, /pricing, static assets
 * - Protected: /app/*, /api/studio/*, /api/agent/*
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─── Skip public routes ─────────────────────────────────────────
    const publicPaths = [
        '/api/auth',
        '/api/health',
        '/api/airdrops',
        '/_next',
        '/favicon',
        '/images',
        '/fonts',
    ];

    const publicPages = ['/', '/marketplace', '/atlas', '/pricing', '/docs', '/about', '/auth'];

    if (
        publicPaths.some((p) => pathname.startsWith(p)) ||
        publicPages.includes(pathname) ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // ─── Refresh Supabase session from cookies ──────────────────────
    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase credentials missing. Using placeholder values for build/middleware checks.');
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Refresh the session (this also updates cookies)
    const { data: { user } } = await supabase.auth.getUser();

    // ─── Protect /app/* and /api/* routes ───────────────────────────
    const protectedPaths = ['/app', '/api/studio', '/api/agent', '/api/dca'];

    if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
        // For API routes: return 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Unauthorized. Please sign in with your wallet.' },
                { status: 401 }
            );
        }

        // For pages: redirect to auth
        const url = request.nextUrl.clone();
        url.pathname = '/auth';
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
