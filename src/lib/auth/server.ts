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
        // Avoid leaking deployment proxy host headers to Neon Auth.
        // Better Auth may validate hostname from these forwarded values.
        headers.delete('x-forwarded-host');
        headers.delete('x-forwarded-proto');
        headers.delete('x-forwarded-port');
        headers.delete('x-forwarded-for');
        headers.delete('x-real-ip');
        headers.delete('cf-connecting-ip');
        headers.delete('x-nf-client-connection-ip');

        // Set forwarded values to the CLIENT origin so Better Auth's CSRF
        // check sees x-forwarded-host matching the browser Origin header.
        headers.set('x-forwarded-host', incoming.host);
        headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));
        headers.set('x-forwarded-port', incoming.port || (incoming.protocol === 'https:' ? '443' : '80'));

        const upstream = await fetch(target, {
            method,
            headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer(),
            redirect: 'manual',
        });

        return new Response(upstream.body, {
            status: upstream.status,
            headers: upstream.headers,
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
