## 2025-02-23 - Prevent Open Redirect Vulnerability in Auth Flows
**Vulnerability:** The application was directly using unvalidated URLs from `searchParams.get('redirect')` and `searchParams.get('next')` as redirect targets, which exposes the system to Open Redirect vulnerabilities if users were tricked into clicking maliciously crafted links.
**Learning:** Whenever an application redirects a user based on query parameters, it must explicitly validate that the URL is a relative path or an explicitly allowed absolute path, to avoid sending users to a potentially malicious site.
**Prevention:** Always validate and sanitize user-controlled redirect paths using a utility function such as `sanitizeRedirect` before using them. Ensure the URLs conform to allowed relative patterns.
