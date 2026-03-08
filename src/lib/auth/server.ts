import { createNeonAuth } from '@neondatabase/auth/next/server';

// Detect if we are in a static generation/build phase (Next.js specific)
const isBuildPhase =
    process.env.npm_lifecycle_event === 'build' ||
    process.env.NEXT_PHASE === 'phase-production-build';

export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET || (
            isBuildPhase ? "BUILD_PLACEHOLDER" : (() => { throw new Error("NEON_AUTH_COOKIE_SECRET is not configured."); })()
        ),
    },
});
