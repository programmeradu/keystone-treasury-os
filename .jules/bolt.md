## 2026-04-11 - Precompute regexes and sorting on module load
**Learning:** The `resolveChainFromText` function was unnecessarily sorting aliases and recompiling regexes on every call. This introduced O(N log N) overhead and regex compilation latency in a hot path.
**Action:** Always precalculate and cache heavy operations like regex compilation and array sorting at module load time for text processing utilities.
