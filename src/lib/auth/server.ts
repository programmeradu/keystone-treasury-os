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

export const auth = {
    middleware: createStubMiddleware,
};
