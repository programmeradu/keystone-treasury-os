## 2026-03-17 - Prevent Expensive Sorting on Re-render
**Learning:** React components that frequently update or render (like dashboard components reading from a context) can cause performance bottlenecks if expensive array operations like mapping, sorting, and slicing are placed directly in the render body.
**Action:** Always wrap array sorting/filtering/mapping operations in `useMemo` to prevent recomputation on every render.
