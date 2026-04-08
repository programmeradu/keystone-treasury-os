## 2024-05-30 - DOM-based XSS via innerHTML concatenation
**Vulnerability:** DOM-based Cross-Site Scripting (XSS) through direct `innerHTML` assignment with unsanitized token metadata (like `token.symbol`) and error messages in `VaultAssetsCompact.tsx` and iframe templates.
**Learning:** React components sometimes fall back to direct DOM manipulation for error handling (e.g., `<img>` `onError`), bypassing React's built-in XSS protections. String concatenation into `innerHTML` allows malicious scripts to execute.
**Prevention:** Avoid string concatenation with `innerHTML`. Instead, define the static structure via `innerHTML` with a placeholder class, and set dynamic content using `textContent` on the targeted placeholder element.
