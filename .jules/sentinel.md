## 2025-02-28 - Insecure Randomness in API Keys and Tokens
**Vulnerability:** `Math.random()` was being used to generate API keys in `src/components/settings/ApiKeysView.tsx` and email verification tokens in `src/app/api/alerts/subscribe/route.ts`. `Math.random()` is not cryptographically secure, allowing potential predictability of sensitive keys and tokens.
**Learning:** Even for non-production environments or seemingly low-risk tokens, utilizing standard cryptographic libraries is essential to maintain a strong security posture. Generating keys client-side also introduces a vector where `Math.random()` values can be exposed or manipulated more easily.
**Prevention:** Always use Web Crypto API (`window.crypto.getRandomValues`) on the client-side or Node.js `crypto` module (`crypto.getRandomValues` or `crypto.randomBytes`) on the server-side for any token, secret, or key generation.
## 2024-05-18 - Missing rel="noopener noreferrer"
**Vulnerability:** Found multiple instances of `<a target="_blank">` missing the `rel="noopener noreferrer"` attribute across the codebase, including components like `VaultTable`, `site-footer`, `RepoManager` and the Resend email template `route.ts`.
**Learning:** `target="_blank"` without `rel="noopener noreferrer"` exposes the site to "tabnabbing", where the newly opened tab can manipulate the original tab via `window.opener`. This is especially dangerous when linking to user-submitted or less-trusted URLs.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"`. Enforce this using linting rules (like `react/jsx-no-target-blank` from `eslint-plugin-react`).
## 2024-05-30 - [Insecure Randomness for Identifier Generation]
**Vulnerability:** Used `Math.random()` to generate database IDs and sensitive tracking tokens across API routes (`appId`, `botId`, `purchId`, etc). `Math.random()` is not cryptographically secure and can be easily guessed or collided, leading to potential enumeration attacks or predictable token generation.
**Learning:** This existed because `Math.random().toString(36)` is a common but unsafe quick shorthand for generating strings, often copied without considering the security context of the identifier.
**Prevention:** Always use `crypto.randomUUID()` or `crypto.getRandomValues()` for generating any unique identifier, token, or seed that requires unpredictability or uniqueness.
