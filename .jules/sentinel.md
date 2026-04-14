## 2025-02-27 - [Open Redirect in Auth Redirect]
**Vulnerability:** Found an open redirect vulnerability in `src/app/auth/page.tsx` where `searchParams.get('redirect')` was directly assigned to `window.location.href`.
**Learning:** `searchParams.get()` input is untrusted and must be sanitized. If not validated, an attacker can construct a URL like `?redirect=https://malicious.site`, resulting in an open redirect after auth.
**Prevention:** Always validate and sanitize the input to prevent Open Redirect vulnerabilities. Ensure the URL is a relative path starting with `/` and not an absolute or protocol-relative URL (e.g., `redirect.startsWith('/') && !redirect.startsWith('//')`) before assigning it to `window.location.href` or using it for a redirect.
