## 2024-10-XX - [Memoize expensive array operations]
**Learning:** In React components that handle dynamic data arrays, performing `sort` inside the render function without `useMemo` causes an `O(N log N)` operation on every render, which is a significant performance bottleneck.
**Action:** Always wrap array mapping and sorting operations in `React.useMemo` to avoid unnecessary computations and prevent blocking the UI thread.
