## 2024-05-18 - Optimize ExecutionDashboard Summary Stats
**Learning:** In auto-refreshing React dashboard components, multiple repeated `.filter(condition).length` calls within the render loop perform O(N * K) operations (where N is the array size and K is the number of filters) on every re-render interval.
**Action:** Consolidate these specific array traversals into a single `useMemo` block with a `reduce` function that computes all required metrics in a single O(N) pass, effectively eliminating redundant computational overhead without sacrificing code clarity.
