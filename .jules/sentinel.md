## 2024-05-18 - Missing rel="noopener noreferrer"
**Vulnerability:** Found multiple instances of `<a target="_blank">` missing the `rel="noopener noreferrer"` attribute across the codebase, including components like `VaultTable`, `site-footer`, `RepoManager` and the Resend email template `route.ts`.
**Learning:** `target="_blank"` without `rel="noopener noreferrer"` exposes the site to "tabnabbing", where the newly opened tab can manipulate the original tab via `window.opener`. This is especially dangerous when linking to user-submitted or less-trusted URLs.
**Prevention:** Always pair `target="_blank"` with `rel="noopener noreferrer"`. Enforce this using linting rules (like `react/jsx-no-target-blank` from `eslint-plugin-react`).
