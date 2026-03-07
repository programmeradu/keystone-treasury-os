## 2024-05-24 - Batching Jupiter API Token Price Requests
**Learning:** Mapping individual Jupiter quote simulations using `getTokenPrice` across an array of tokens inside `Promise.all` can quickly trigger rate limits and performance bottlenecks when there are many token prices to fetch.
**Action:** Always prefer the batched `api.jup.ag/price/v2` endpoint which accepts multiple comma-separated IDs via the `?ids=` query parameter to fetch many token prices in a single HTTP request, effectively batching data requirements without scaling request volume.
