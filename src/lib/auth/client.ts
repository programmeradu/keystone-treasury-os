'use client';

/**
 * Neon Auth client helper.
 *
 * The @neondatabase/auth beta package ships without its dist/ files,
 * so importing from '@neondatabase/auth/next' breaks the build.
 *
 * This shim preserves the Neon-like authClient API and delegates
 * auth actions to the proxied Neon Auth endpoints under /api/auth.
 */

interface AuthSessionData {
    session: unknown;
    user: { id: string; email?: string; name?: string };
}

interface AuthSession {
    data: AuthSessionData | null;
    error: { message: string } | null;
}

export const authClient = {
    async getSession(): Promise<AuthSession> {
        try {
            const res = await fetch('/api/auth/get-session', {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                return { data: null, error: null };
            }

            const payload = await res.json().catch(() => null) as any;
            const session = payload?.session || payload?.data?.session || null;
            const user = payload?.user || payload?.data?.user || session?.user || null;

            if (!session || !user?.id) {
                return { data: null, error: null };
            }

            return {
                data: {
                    session,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name || user.fullName || user.email,
                    },
                },
                error: null,
            };
        } catch {
            return { data: null, error: null };
        }
    },
    signIn: {
        async social(opts: { provider: string; callbackURL?: string }) {
            const callbackPath = opts.callbackURL || '/app';
            const callback = callbackPath.startsWith('http')
                ? callbackPath
                : `${window.location.origin}${callbackPath}`;
            const errorCallback = `${window.location.origin}/auth`;

            const res = await fetch('/api/auth/sign-in/social', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: opts.provider,
                    callbackURL: callback,
                    errorCallbackURL: errorCallback,
                }),
                redirect: 'follow',
            });

            if (res.redirected) {
                window.location.href = res.url;
                return;
            }

            // Better Auth returns { url, redirect } when Content-Type is JSON
            const data = await res.json().catch(() => null);
            const redirectUrl = data?.url || data?.redirect;
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }

            // If the proxy returned a 3xx with Location header
            const location = res.headers.get('location');
            if (location) {
                window.location.href = location;
            }
        },
    },
    async signOut() {
        try {
            const postRes = await fetch('/api/auth/sign-out', {
                method: 'POST',
                credentials: 'include',
            });

            if (!postRes.ok) {
                await fetch('/api/auth/sign-out', {
                    method: 'GET',
                    credentials: 'include',
                });
            }
        } catch {
            // Swallow sign-out errors so logout UX can continue.
        }
    },
};
