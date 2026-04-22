
## 2024-05-20 - Fix Open Redirect in Auth Flows
**Vulnerability:** Unvalidated redirect URLs passed via query parameters (`next` and `redirect`) in authentication flows could allow attackers to redirect users to malicious sites.
**Learning:** Query parameters controlling redirects (`searchParams.get('next')` or `searchParams.get('redirect')`) were used directly in `NextResponse.redirect()` and `window.location.href` without validation, exposing the application to Open Redirect attacks.
**Prevention:** Always validate and sanitize user-supplied redirect URLs. Ensure the URL is a relative path starting with a single `/` and not a protocol-relative URL (`//`) or absolute URL. Use a centralized utility like `sanitizeRedirect` before applying the redirect.
