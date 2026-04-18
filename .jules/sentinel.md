## 2024-05-24 - Fix Open Redirect Vulnerability in Auth Flow

**Vulnerability:** Unvalidated redirect URLs passed via query parameters (`next` and `redirect`) allowed open redirect vulnerabilities where users could be redirected to arbitrary external sites (e.g., `//evil.com`).

**Learning:** URL components retrieved directly from `searchParams.get()` were being assigned to `window.location.href` or `NextResponse.redirect()` without validation. A common bypass is using protocol-relative URLs (`//example.com`) which bypassed basic `/` starting checks if not done correctly.

**Prevention:** Always validate and sanitize user-provided redirect URLs. Use the centralized `sanitizeRedirect` utility in `src/lib/utils.ts` which ensures the URL starts with exactly one `/` and falls back to a safe default path.
