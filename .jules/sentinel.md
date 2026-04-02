## 2025-03-18 - [Insecure Random Identifier Generation]
**Vulnerability:** Weak, predictable random identifiers generated using `Math.random().toString(36)`.
**Learning:** `Math.random()` is not cryptographically secure, and using it to generate API tokens, bot IDs, run IDs or app IDs can lead to ID collision and predictability vulnerabilities. The codebase had this pattern in multiple locations.
**Prevention:** Always use standard, cryptographically secure functions like `globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)` for creating short and secure unique identifiers to avoid collision risks.
