## 2024-04-30 - Open Redirect Vulnerability in Authentication Flow
**Vulnerability:** Open redirect allowing attackers to redirect users to malicious domains after authentication via the `redirect` and `next` query parameters.
**Learning:** Raw query parameters like `searchParams.get('redirect')` were assigned directly to `window.location.href` and `NextResponse.redirect()` without validation, bypassing same-origin security.
**Prevention:** Always sanitize redirect URLs sourced from user input (like query parameters). Use a centralized utility like `sanitizeRedirect` to ensure the URL is a relative path (starts with `/` but not `//` or `/\`) before using it in redirects.
