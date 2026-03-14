## 2024-05-18 - Hardcoded Secrets Removed
**Vulnerability:** Found hardcoded fallback values for `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` across the codebase (e.g. `src/middleware.ts`, `src/lib/supabase.ts`, etc).
**Learning:** Development defaults should never be committed into source code, especially for critical authentication and database access keys. Hardcoded keys can be easily exploited if the code is made public or improperly deployed without environment variables set.
**Prevention:** Always throw explicit errors if critical environment variables are missing during startup or function invocation, enforcing secure deployments.
