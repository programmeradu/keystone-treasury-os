## 2024-05-24 - Fix Open Redirect vulnerability in Auth callback and page
**Vulnerability:** Open Redirect vulnerability via unvalidated URL query parameters (`next` and `redirect`) in `src/app/api/auth/callback/route.ts` and `src/app/auth/page.tsx` allowing redirection to arbitrary external domains.
**Learning:** `searchParams.get` for redirects should never be trusted and directly assigned to `window.location.href` or `NextResponse.redirect` without validation to prevent protocol-relative (e.g. `//evil.com`) or absolute URL redirects.
**Prevention:** Always use a utility function like `sanitizeRedirect` that enforces relative path navigation (starting with `/` but not `//`), providing a safe fallback (e.g., `/app`).
