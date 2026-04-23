## 2025-04-23 - Open Redirect Vulnerability
**Vulnerability:** Open Redirect vulnerability where `searchParams.get('redirect')` was directly assigned to `window.location.href` without sanitization.
**Learning:** Query parameters must not be trusted and directly fed to client-side navigation functions, as attackers can craft phishing links bypassing local domain limitations.
**Prevention:** Use a centralized utility like `sanitizeRedirect` to ensure redirect URLs are strictly relative paths starting with `/` and not `//` or `/\`.
