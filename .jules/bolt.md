## 2025-02-28 - Precomputing Regexes for Chain Resolution
**Learning:** `resolveChainFromText` in `src/lib/chains.ts` was doing O(N log N) sorting and O(N) regex compilations on every invocation to match chain aliases in free text.
**Action:** Always hoist static object sorting and repeated standard Regex compilations outside of function execution scope into a precomputed module-level constant.
