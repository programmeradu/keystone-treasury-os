## 2025-02-28 - Insecure Randomness in API Keys and Tokens
**Vulnerability:** `Math.random()` was being used to generate API keys in `src/components/settings/ApiKeysView.tsx` and email verification tokens in `src/app/api/alerts/subscribe/route.ts`. `Math.random()` is not cryptographically secure, allowing potential predictability of sensitive keys and tokens.
**Learning:** Even for non-production environments or seemingly low-risk tokens, utilizing standard cryptographic libraries is essential to maintain a strong security posture. Generating keys client-side also introduces a vector where `Math.random()` values can be exposed or manipulated more easily.
**Prevention:** Always use Web Crypto API (`window.crypto.getRandomValues`) on the client-side or Node.js `crypto` module (`crypto.getRandomValues` or `crypto.randomBytes`) on the server-side for any token, secret, or key generation.
## 2024-05-18 - Missing rel="noopener noreferrer"
**Vulnerability:** Found multiple instances of `<a target="_blank">` missing the `rel="noopener noreferrer"` attribute across the codebase, including components like `VaultTable`, `site-footer`, `RepoManager` and the Resend email template `route.ts`.
**Learning:** `target="_blank"` without `rel="noopener noreferrer"` exposes the site to "tabnabbing", where the newly opened tab can manipulate the original tab via `window.opener`. This is especially dangerous when linking to user-submitted or less-trusted URLs.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"`. Enforce this using linting rules (like `react/jsx-no-target-blank` from `eslint-plugin-react`).

## 2024-05-23 - [Remove hardcoded secrets and fallback keys]
**Vulnerability:** Several authentication files (`src/middleware.ts`, `src/lib/auth/server.ts`, `src/lib/supabase.ts`) used fallback values for critical environment variables (like JWT secrets and Supabase service keys). This could lead to the application inadvertently starting or running using known/insecure default secrets, creating a significant security gap.
**Learning:** Hardcoded fallbacks allow the application to fail insecurely instead of failing explicitly when misconfigured.
**Prevention:** Always validate the presence of required sensitive environment variables before using them, and throw an explicit `Error` or fail fast to prevent silent insecure operation.
