## 2024-05-18 - Open Redirect Vulnerability
**Vulnerability:** URL redirect parameters (e.g., `?redirect=` or `?next=`) were being used directly to set `window.location.href` or `NextResponse.redirect()` without validation.
**Learning:** This can lead to Open Redirect attacks, where attackers trick users into visiting a legitimate site that then automatically redirects them to a malicious site.
**Prevention:** Always validate and sanitize user-provided redirect URLs. Ensure the URL is a relative path (starts with `/` and not `//` or `/\`) using a shared utility function like `sanitizeRedirect` before using it in any redirection logic.
