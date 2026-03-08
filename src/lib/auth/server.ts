import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET || (
            process.env.npm_lifecycle_event === 'build' ? "BUILD_PLACEHOLDER" : (() => { throw new Error("NEON_AUTH_COOKIE_SECRET is not configured."); })()
        ),
    },
});
