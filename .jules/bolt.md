
## 2025-02-24 - [Jupiter Bulk API Performance]
**Learning:** For DCA automated bots and repeated token price checks, using `Promise.all` with individual Jupiter `getTokenPrice` calls causes heavy API rate limits (HTTP 401s from `api.jup.ag/price/v2` when unauthenticated or repeated) and latency. The Jupiter v2 Price API supports bulk querying via comma-separated `ids` parameter which is significantly more efficient and avoids API throttling.
**Action:** Consistently use batched `ids` endpoints (`getBatchTokenPrices`) over looped individual fetches when tracking or managing multiple user tokens concurrently.
