## 2024-03-11 - [Predictable Identifiers Generated via Math.random]
**Vulnerability:** Insecure PRNG (`Math.random()`) used for generating unique identifiers like `appId` and `purchId` in the database.
**Learning:** `Math.random()` does not provide cryptographically secure random numbers and its outputs can be predicted or collide easily, especially under heavy load. This allows an attacker to predict IDs of marketplace items or purchase receipts.
**Prevention:** Never use `Math.random()` to generate sensitive strings, tokens, or API keys. Always use cryptographically secure methods like `globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)` to ensure runtime-agnostic compatibility and prevent Birthday Paradox collisions.
