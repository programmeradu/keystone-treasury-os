## 2024-05-18 - Unsanitized Open Redirects
**Vulnerability:** Next.js `searchParams.get('redirect')` directly passed to `window.location.href` and Next.js `searchParams.get('next')` directly passed to `NextResponse.redirect`.
**Learning:** Found two locations where open redirect vulnerabilities exist. We must validate and sanitize URLs from query params to ensure they are relative paths.
**Prevention:** Always validate `redirect` URLs to ensure they start with a single `/` and not `//` or a protocol (like `http`).
