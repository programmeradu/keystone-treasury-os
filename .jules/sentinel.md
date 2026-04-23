
## 2024-05-23 - Insecure Randomness in Marketplace Object IDs
**Vulnerability:** Weak, predictable random number generation was found in `src/lib/studio/marketplace.ts` using `Math.random().toString(36)` to generate `appId` and `purchId` strings.
**Learning:** This approach exposes the system to ID collision or brute-force tracking when creating apps or purchases.
**Prevention:** Always use cryptographically secure standard libraries like `globalThis.crypto.randomUUID()` to generate robust unique identifiers, particularly in backend or sensitive contexts where Birthday Paradox collisions must be mitigated.
