## 2026-03-10 - Memoizing Expensive Token Sorting
**Learning:** React components that sort arrays (like VaultAssetsCompact sorting tokens by value) will re-compute the O(N log N) sort on every single re-render unless memoized. In a dashboard with frequent data updates or state changes, this can cause significant UI thread blocking.
**Action:** Always wrap array sorting and mapping operations in `React.useMemo` when they depend on props or state, especially in dashboard components that render frequently.
