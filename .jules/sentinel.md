
## 2024-06-25 - Prevent Open Redirect Vulnerabilities
**Vulnerability:** Found unvalidated user input being passed directly to URL redirect parameters (e.g., `?redirect=...` and `?next=...`) which could be exploited for Open Redirect attacks.
**Learning:** Redirect parameters sourced from query parameters were being directly utilized or fallen back without ensuring they correspond to a relative application path. This is a common gap allowing attackers to craft malicious links.
**Prevention:** Always validate and sanitize user-provided redirect URLs utilizing a central utility like `sanitizeRedirect` from `@/lib/utils` that ensures the path is relative (`startsWith('/')`) and rejects protocol-relative or UNC paths (like `//` or `/\`).
