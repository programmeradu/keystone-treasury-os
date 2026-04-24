
## 2024-05-18 - Open Redirect in Auth and OAuth Flow
**Vulnerability:** The application was directly taking URL parameters (`next` in OAuth callback and `redirect` in auth page) and using them to redirect the user after authentication without any validation. This allows attackers to craft a URL like `https://example.com/auth?redirect=//malicious.com` which would redirect users to a phishing site after login.
**Learning:** React Server Components and Next.js APIs often extract query parameters to handle state transitions (like post-login redirect). Without validation, these parameters are implicitly trusted, creating Open Redirect vulnerabilities. Next.js router naturally resolves `//malicious.com` or `/\malicious.com` to external domains.
**Prevention:** Always validate user-provided redirect URLs. Create and enforce a centralized `sanitizeRedirect` utility that ensures the URL is a relative path starting with `/` but strictly not `//` or `/\` before redirecting.
