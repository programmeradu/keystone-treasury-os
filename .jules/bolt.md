## 2024-04-19 - Optimize React Re-renders by Consolidating .filter().length
**Learning:** Found an anti-pattern in `ExecutionDashboard.tsx` where multiple `.filter(cond).length` calls were used to calculate summary statistics in a frequently re-rendered component (auto-refresh enabled). This results in multiple O(N) traversals of the same array on every render.
**Action:** Replace multiple `.filter().length` array iterations with a single `.reduce()` pass wrapped in a `useMemo` hook to calculate summary counts in O(N) time and prevent unnecessary recalculations.
