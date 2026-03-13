## 2025-02-23 - Hardcoded JWT Secrets

**Vulnerability:** A hardcoded secret (`'keystone_sovereign_os_2026'`) was used as a fallback for `JWT_SECRET` in multiple files (`src/app/api/auth/exchange-session/route.ts`, `src/app/api/auth/siws/route.ts`, `src/middleware.ts`, `src/app/api/liveblocks-auth/route.ts`).
**Learning:** Hardcoded fallbacks for sensitive environment variables provide a false sense of security and allow applications to run in an insecure default state. They can also leak across source control.
**Prevention:** Never use hardcoded secrets. Instead, throw a runtime error if the required environment variables are missing. To satisfy build systems (like Next.js) where runtime variables might be absent, conditionally return a dummy placeholder strictly during the build phase (`process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build'`).
