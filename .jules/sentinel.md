## 2024-06-25 - Weak Random Number Generation
**Vulnerability:** Weak random number generation using Math.random() for secure tokens or IDs
**Learning:** Math.random() is not cryptographically secure and can lead to predictable IDs or tokens, causing collisions or unauthorized access.
**Prevention:** Use cryptographically secure methods like crypto.randomUUID() for generating sensitive tokens or unique identifiers.
