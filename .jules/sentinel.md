
## 2023-10-27 - [Fix Open Redirect vulnerability]
**Vulnerability:** Open redirect vulnerabilities via unsanitized `redirect` and `next` query parameters.
**Learning:** Always validate and sanitize user-controlled redirect URLs to prevent attackers from redirecting users to malicious sites, which could be exploited in phishing attacks or authorization code leakage.
**Prevention:** Use a dedicated validation function ensuring the redirect URL is a relative path starting with `/` and not `//` before setting `window.location.href` or passing to `NextResponse.redirect`.
