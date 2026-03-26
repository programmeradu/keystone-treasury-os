## 2024-05-24 - Cryptographically Insecure ID Generation
**Vulnerability:** Weak, predictable identifier generation using `Math.random().toString(...)` for application, purchase, and bot IDs.
**Learning:** `Math.random()` does not provide cryptographically secure random numbers, leaving generated IDs vulnerable to collision and predictability. In a financial application like Keystone, this could allow ID guessing.
**Prevention:** Always use secure sources of randomness, like `globalThis.crypto.randomUUID()`. For short identifiers, format it safely (e.g., `globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)`).
