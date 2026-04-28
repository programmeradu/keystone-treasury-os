
## 2025-04-28 - Open Redirect Vulnerability in Authentication Flows
**Vulnerability:** The application was directly assigning user-controlled query parameters (`searchParams.get('redirect')` and `searchParams.get('next')`) to `window.location.href` and using them in server-side redirects (`NextResponse.redirect`) without validation.
**Learning:** This pattern creates an Open Redirect vulnerability, where attackers can craft malicious links that appear to come from our domain but redirect users to attacker-controlled phishing sites after successful authentication.
**Prevention:** Always validate and sanitize user-provided redirect URLs. Use a centralized utility function like `sanitizeRedirect` that ensures the redirect target is a relative path starting with exactly one slash (`/`) and preventing protocol-relative URLs (`//`) and backslash bypasses (`/\`).
