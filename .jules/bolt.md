
## 2024-05-01 - Consolidate Multiple Array Filters in Render Cycle
**Learning:** Performing multiple `.filter(...).length` operations on the same array inside a component's render cycle results in O(M*N) complexity (where M is the number of filters and N is array size). In frequently auto-refreshing components like `ExecutionDashboard` (which defaults to a 2000ms refresh interval), this redundant traversal causes unnecessary main thread overhead.
**Action:** When calculating multiple categorical counts from a single data source, consolidate the operations into a single `.reduce()` pass and wrap it in `useMemo` to cache the result between identical references.
