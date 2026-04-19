## 2024-05-16 - Prevent Open Redirects via URL Parameters

**Vulnerability:** Open Redirect vulnerabilities in auth-related routes (`src/app/auth/page.tsx` and `src/app/api/auth/callback/route.ts`). The application directly used `searchParams.get('redirect')` and `searchParams.get('next')` to perform redirects without validation, allowing attackers to construct URLs that redirect users to malicious domains (e.g., `?redirect=//evil.com`).

**Learning:** URL query parameters controlling redirects must never be trusted implicitly. Browser behaviors treat `//` or `/\` as protocol-relative URLs, meaning a redirect string like `//evil.com` will execute an external redirect without needing `https://`.

**Prevention:** Always validate and sanitize redirect query parameters before assignment to `window.location.href` or `NextResponse.redirect()`. Use a centralized utility function (e.g., `sanitizeRedirect` in `src/lib/utils.ts`) that strictly enforces relative paths by checking that the URL starts with `/` and explicitly checking it does not start with `//` or `/\`. Provide a safe fallback (like `/app`) if validation fails.
