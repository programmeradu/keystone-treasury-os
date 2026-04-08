
## 2025-03-11 - [Jupiter API Optimization]
**Learning:** Calling `getJupiterQuote` (via `getTokenPrice`) inside `Promise.all` arrays for multiple tokens causes O(N) external requests, triggering rate limits and degrading performance for token list fetches. The Jupiter API Lite endpoint is for explicit swaps, while Jupiter Price API V2 natively supports batched token prices.
**Action:** When mapping token prices in backend lists, always use the batched `getBatchTokenPrices` helper leveraging `https://api.jup.ag/price/v2` to replace `Promise.all` + `getTokenPrice`. This turns an O(N) fetch into an O(1) request.
