## 2024-03-10 - [Batch Token Prices via Jupiter API v2]
**Learning:** For performance, never map individual `getTokenPrice` simulation calls to fetch token prices. Simulation calls are slow and rate-limited.
**Action:** Use the Jupiter Price API V2 endpoint (`https://api.jup.ag/price/v2`) with batched `getBatchTokenPrices` logic. This drastically improves backend performance when calculating portfolios or balances.
