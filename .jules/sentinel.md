# Sentinel Security Journal

## 2024-05-18 - Open Redirect in Authentication Flow
**Vulnerability:** Unsanitized `redirect` and `next` query parameters were being used directly in `window.location.href` and `NextResponse.redirect()` within the authentication flow (`/app/auth/page.tsx` and `/api/auth/callback/route.ts`).
**Learning:** The application heavily relies on URL parameters to track where users should be sent after a successful OAuth login or wallet connection. Passing these parameters directly to navigation sinks without validation allows attackers to craft malicious links (e.g., `?redirect=//evil.com`) that hijack the user's session post-authentication.
**Prevention:** Always validate user-provided redirect URLs to ensure they are relative paths. Created a centralized `sanitizeRedirect` utility in `src/lib/utils.ts` that enforces paths must start with `/` but not `//` or `/\`, defaulting to `/app` on invalid input.
