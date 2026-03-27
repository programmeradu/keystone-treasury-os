## 2025-02-14 - Fix hardcoded JWT secret fallback
**Vulnerability:** A hardcoded fallback secret (`keystone_sovereign_os_2026`) was used for `JWT_SECRET` in multiple files (`src/middleware.ts`, `src/app/api/auth/siws/route.ts`, `src/app/api/liveblocks-auth/route.ts`, `src/app/api/auth/exchange-session/route.ts`).
**Learning:** Hardcoded secrets in code can lead to critical vulnerabilities if the environment variable is not properly configured, allowing the application to run with insecure default secrets.
**Prevention:** Always explicitly check for the presence of sensitive environment variables like `JWT_SECRET` and throw an error or return a 500 response if they are missing. Use a build-time placeholder only when necessary for Next.js static generation on CI.
