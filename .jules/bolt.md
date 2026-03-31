## 2026-03-31 - Optimize array filtering during render
**Learning:** React re-renders can easily trigger expensive O(N) array filtering operations multiple times when calculating conditional UI labels (like pluralization). This can be hidden in inline JSX.
**Action:** Always extract array operations like `.filter()` to a `useMemo` block when their results only change when a specific dependency (like the `messages` array) changes.
