import { createNeonAuth } from '@neondatabase/auth/next/server';

// Detect if we are in a static generation/build phase (Next.js or CI specific)
const isBuildPhase =
    process.env.npm_lifecycle_event?.includes('build') ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NETLIFY === 'true' ||
    process.env.CI === 'true';

export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET || (
            isBuildPhase ? "BUILD_PLACEHOLDER" : (() => { throw new Error("NEON_AUTH_COOKIE_SECRET is not configured."); })()
        ),
    },
});
