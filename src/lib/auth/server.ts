import { NextResponse, type NextRequest } from 'next/server';

/**
 * Neon Auth server helper.
 *
 * The @neondatabase/auth beta package currently ships without its dist/
 * files, so importing from '@neondatabase/auth/next/server' breaks the
 * build.  We provide a lightweight stub that keeps the middleware
 * functional:
 *   - The OAuth verifier exchange route (neon_auth_session_verifier) is
 *     handled by the Neon Auth proxy at /api/auth, so the middleware
 *     just needs to let the request through.
 */

function createStubMiddleware(_opts: { loginUrl: string }) {
    return (_request: NextRequest) => {
        // Allow the request to continue – the actual OAuth exchange is
        // handled by the Neon Auth proxy endpoint at /api/auth.
        return NextResponse.next();
    };
}

function createStubHandler() {
    const proxy = async (request: NextRequest) => {
        const base = process.env.NEON_AUTH_BASE_URL || 'https://ep-plain-hill-alckyy0h.neonauth.c-3.eu-central-1.aws.neon.tech/neondb/auth';
        if (!base) {
            return NextResponse.json(
                { error: 'NEON_AUTH_BASE_URL is not configured.' },
                { status: 503 },
            );
        }

        const incoming = new URL(request.url);
        const routeSuffix = incoming.pathname.replace(/^\/api\/auth/, '');
        const target = new URL(`${base.replace(/\/$/, '')}${routeSuffix}${incoming.search}`);

        const method = request.method.toUpperCase();
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.delete('content-length');
        // Strip all proxy/forwarding headers so Neon Auth sees a clean
        // request and uses its own Host header for origin validation.
        headers.delete('x-forwarded-host');
        headers.delete('x-forwarded-proto');
        headers.delete('x-forwarded-port');
        headers.delete('x-forwarded-for');
        headers.delete('x-real-ip');
        headers.delete('cf-connecting-ip');
        headers.delete('x-nf-client-connection-ip');

        // Match Origin to the target so Better Auth's CSRF check passes
        // (it compares Origin against the Host header, which fetch sets
        // automatically to the target host).
        headers.set('origin', target.origin);
        headers.set('referer', target.origin + '/');

        const upstream = await fetch(target, {
            method,
            headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer(),
            redirect: 'manual',
        });

        // Rewrite Set-Cookie headers so cookies are set on the app's
        // domain instead of the Neon Auth domain. Without this the
        // browser silently drops the session cookies because the domain
        // doesn't match the page origin.
        const responseHeaders = new Headers(upstream.headers);
        const setCookies = upstream.headers.getSetCookie?.() ?? [];
        if (setCookies.length > 0) {
            responseHeaders.delete('set-cookie');
            for (const cookie of setCookies) {
                // Strip Domain so the cookie defaults to the app's host.
                // Strip Partitioned (only meaningful in third-party contexts).
                // Change SameSite=None to Lax (first-party cookie).
                const rewritten = cookie
                    .replace(/;\s*domain=[^;]*/gi, '')
                    .replace(/;\s*path=[^;]*/gi, '; Path=/')
                    .replace(/;\s*partitioned/gi, '')
                    .replace(/;\s*samesite=none/gi, '; SameSite=Lax');
                responseHeaders.append('set-cookie', rewritten);
            }
        }

        // Rewrite Location header for redirects so the browser stays
        // on the app domain instead of being sent to the Neon Auth host.
        const location = responseHeaders.get('location');
        if (location) {
            try {
                const locUrl = new URL(location);
                if (locUrl.origin === target.origin) {
                    // Map the Neon Auth path back to /api/auth/...
                    const basePath = new URL(base).pathname.replace(/\/$/, '');
                    const suffix = locUrl.pathname.startsWith(basePath)
                        ? locUrl.pathname.slice(basePath.length)
                        : locUrl.pathname;
                    responseHeaders.set(
                        'location',
                        `${incoming.origin}/api/auth${suffix}${locUrl.search}`,
                    );
                }
            } catch {}
        }

        return new Response(upstream.body, {
            status: upstream.status,
            headers: responseHeaders,
        });
    };

    return {
        GET: proxy,
        POST: proxy,
    };
}

type ServerSessionData = {
    session: unknown;
    user: { id: string; email?: string; name?: string };
};

type ServerSessionResult = {
    data: ServerSessionData | null;
    error: { message: string } | null;
};

export const auth = {
    middleware: createStubMiddleware,
    handler: createStubHandler,
    async getSession(): Promise<ServerSessionResult> {
        return {
            data: null,
            error: { message: 'Neon Auth server not available (beta package incomplete)' },
        };
    },
};
