## 2025-02-14 - Open Redirect in Authentication Flow
**Vulnerability:** Found an Open Redirect vulnerability where authentication callbacks and pages consumed user-supplied `?redirect=` and `?next=` parameters verbatim and passed them to `window.location.href = ...` or `NextResponse.redirect(...)`.
**Learning:** In Next.js client and server components, query parameters extracted via `searchParams.get(...)` are un-sanitized. Assigning them directly to `window.location.href` or passing them to routing frameworks enables arbitrary URL redirection.
**Prevention:** Always validate user-supplied redirect URLs to ensure they are relative paths by checking `url.startsWith('/') && !url.startsWith('//')` before redirection.
