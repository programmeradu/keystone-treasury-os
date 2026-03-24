## 2024-03-24 - Hardcoded Service Key
**Vulnerability:** A hardcoded `SUPABASE_SERVICE_ROLE_KEY` was found being used as a fallback.
**Learning:** Hardcoded service keys that bypass RLS are critical security risks. The fallback logic bypassed the intended security of using environment variables to store sensitive secrets.
**Prevention:** Always throw an error if a sensitive environment variable is missing in production. Only use dummy values when checking `process.env.NODE_ENV === 'test'` or `(typeof window === 'undefined' && process.env.CI)`.
