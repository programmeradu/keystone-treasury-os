## 2025-02-23 - Open Redirect Fix

**Vulnerability:** Open Redirect
**Learning:** Found an Open Redirect via URL search parameters in `src/app/auth/page.tsx` and `src/app/api/auth/callback/route.ts` because it blindly accepted `//evil.com`.
**Prevention:** Explicitly validate URL query parameters starting with `/` to ensure they are relative paths, and importantly, ensure they do not start with `//` to avoid protocol-relative absolute URLs.
