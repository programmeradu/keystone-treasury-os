## 2025-02-19 - Batch Jupiter Price API Call in DCA Bot
**Learning:** The DCA bot route was making parallel `getTokenPrice` calls to the Jupiter API (via `lite-api.jup.ag`), potentially hitting rate limits and suffering from N+1 network latency for duplicate tokens across multiple bots.
**Action:** Use `getBatchTokenPrices` using `https://api.jup.ag/price/v2?ids=<mints>` instead, minimizing redundant network calls and dramatically improving route response time.
