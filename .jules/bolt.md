## 2024-04-22 - Consolidating redundant array traversals
**Learning:** Frequently re-rendering components (like auto-refresh dashboards) with multiple `.filter().length` calls on the same array causes redundant O(N) traversals, negatively impacting performance.
**Action:** Consolidate multiple `.filter().length` calls into a single `.reduce()` pass wrapped in `useMemo` to compute counts efficiently in one pass.
