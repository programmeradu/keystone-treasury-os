## 2024-03-15 - [React.memo Avoid Unnecessary Re-renders]
**Learning:** Adding `React.memo` to heavily nested components like `AssetInventoryTable` prevents deep reconciliation.
**Action:** Always verify if complex tables or charts only rely on prop changes and wrap them in `React.memo` to avoid wasted CPU cycles during parent state updates.
