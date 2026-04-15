## 2024-04-12 - Prevent XSS and Command Injection in Next.js/React Components

**Vulnerability:**
1. Cross-Site Scripting (XSS) via `target.parentElement!.innerHTML = '... ' + token.symbol` within an image `onError` handler in `src/components/dashboard/VaultAssetsCompact.tsx`.
2. Command Injection Risk via `exec("anchor build")` in `src/app/api/studio/compile-contract/route.ts`.

**Learning:**
1. Dynamically appending user-controlled input (`token.symbol`) directly into a string that gets set via `innerHTML` opens up a critical XSS vector. When React's event handlers execute raw DOM mutations, it bypasses standard React JSX escaping, allowing malicious script execution if the token symbol contains HTML/script tags.
2. The `child_process.exec` method spawns a shell and concatenates input into a single string. Though "anchor build" was hardcoded, relying on `exec` is a poor security pattern that can easily evolve into command injection vulnerabilities if user arguments are appended later.

**Prevention:**
1. When raw DOM manipulation is required inside an event handler, avoid string concatenation with `innerHTML`. Instead, establish the layout safely with `innerHTML` (e.g., creating a placeholder element with a specific class) and then populate the user-provided dynamic content safely using `textContent` on the targeted element.
2. Standardize on `child_process.execFile` (or `spawn`) and pass arguments as an explicit array (`execFile("anchor", ["build"])`). This ensures the runtime evaluates arguments purely as string parameters rather than executing them in a sub-shell, mitigating command injection inherently.
