## 2024-05-24 - Insecure Random Identifier Generation
**Vulnerability:** Found `Math.random().toString(36)` used for generating sensitive IDs like `appId` and `botId` in `src/app/api/command/route.ts`.
**Learning:** `Math.random()` is not cryptographically secure and is susceptible to collisions and predictability. Hand-rolled random string generators are security risks.
**Prevention:** Always prefer cryptographically secure standard library methods like `globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)` to generate identifiers, tokens, or API keys securely.
