'use client';

/**
 * Neon Auth client helper.
 *
 * The @neondatabase/auth beta package ships without its dist/ files,
 * so importing from '@neondatabase/auth/next' breaks the build.
 *
 * This stub exposes the same surface used by auth/page.tsx and
 * app/layout.tsx (getSession, signIn.social, signOut) so the app
 * compiles and degrades gracefully until the package is fixed.
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
        return { data: null, error: { message: 'Neon Auth client not available (beta package incomplete)' } };
    },
    signIn: {
        async social(opts: { provider: string; callbackURL?: string }) {
            console.warn('[Neon Auth stub] signIn.social called but package is not available', opts);
        },
    },
    async signOut() {
        console.warn('[Neon Auth stub] signOut called but package is not available');
    },
};
