# MEV Scanner - Real Data Implementation Plan

**Current Status**: Mock mode enabled (returns demo arbitrage opportunities)  
**Goal**: Implement real cross-DEX arbitrage detection with live Solana data  
**Priority**: High - This is a key differentiator feature

---

## 🎯 Problem Statement

The MEV Scanner currently uses mock data because:
1. Jupiter Price API v6 doesn't provide per-DEX price breakdowns
2. We need individual DEX prices to calculate arbitrage opportunities
3. Serverless environment has timeout constraints (10 seconds)

To find real arbitrage, we need:
- **Real-time prices** from multiple DEXs (Jupiter, Orca, Raydium, Meteora)
- **Low latency** (opportunities expire in seconds)
- **Accurate execution costs** (gas, slippage, fees)
- **Liquidity depth** (can the trade actually execute?)

---

## 🚀 Solution Options (Ranked by Implementation Ease)

### **Option 1: Jupiter Quote API with DEX Filters** ⭐ RECOMMENDED FOR PHASE 1

**How It Works:**
- Use Jupiter's `/quote` endpoint instead of `/price`
- Request quotes for the same swap but filter to specific DEXs
- Compare quotes to find price differences = arbitrage opportunities

**Implementation:**
```typescript
// Request quotes from different DEXs
const jupiterQuote = await fetch(
  `https://quote-api.jup.ag/v6/quote?inputMint=${SOL}&outputMint=${USDC}&amount=1000000000&slippageBps=50&onlyDirectRoutes=true&dexes=Jupiter`
);

const orcaQuote = await fetch(
  `https://quote-api.jup.ag/v6/quote?inputMint=${SOL}&outputMint=${USDC}&amount=1000000000&slippageBps=50&onlyDirectRoutes=true&dexes=Orca`
);

// Compare outAmount from each quote to find arbitrage
const arbProfit = orcaQuote.outAmount - jupiterQuote.outAmount;
```

**Pros:**
✅ Uses Jupiter's existing infrastructure (proven reliable)  
✅ Built-in slippage and fee calculations  
✅ Direct routes only = faster execution  
✅ Free tier available  
✅ We already use Jupiter successfully elsewhere

**Cons:**
❌ Multiple API calls (3-4 per scan)  
❌ Rate limits on free tier  
❌ Depends on Jupiter being up

**Time to Implement:** 2-4 hours  
**Reliability:** High  
**Cost:** Free (with rate limits)

---

### **Option 2: Birdeye Multi-DEX API** ⭐ RECOMMENDED FOR PHASE 2

**How It Works:**
- Birdeye aggregates price data from all major Solana DEXs
- Single API call gets prices across Jupiter, Orca, Raydium, Meteora
- Endpoint: `/defi/price_volume/multi?list_address=SOL,USDC,BONK`

**Implementation:**
```typescript
const birdeyeRes = await fetch(
  `https://public-api.birdeye.so/defi/multi_price?list_address=${mints.join(',')}&include_liquidity=true`,
  {
    headers: {
      'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
    }
  }
);

const data = await birdeyeRes.json();
// data.data[mint].priceByDex contains prices per DEX
```

**Pros:**
✅ Single API call for all DEX prices  
✅ Includes liquidity data (verify trades are executable)  
✅ Historical price data available  
✅ Battle-tested by top Solana traders  
✅ Cleaner code, less API complexity

**Cons:**
❌ Requires API key (free tier limited)  
❌ Another API dependency  
❌ Slightly less real-time than on-chain queries

**Time to Implement:** 3-5 hours  
**Reliability:** High  
**Cost:** Free tier (3000 requests/month) or $49/month (unlimited)

**Birdeye API Docs:** https://docs.birdeye.so/

---

### **Option 3: DexScreener API** (Alternative to Birdeye)

**How It Works:**
- DexScreener provides real-time DEX data via REST API
- Endpoint: `/latest/dex/pairs/solana/{token_address}`
- Shows all liquidity pools and their prices

**Implementation:**
```typescript
const dexRes = await fetch(
  `https://api.dexscreener.com/latest/dex/tokens/${mint}`
);

const data = await dexRes.json();
// data.pairs contains all pools with priceNative, priceUsd, liquidity
```

**Pros:**
✅ No API key required (completely free)  
✅ Real-time pool data  
✅ Includes volume, liquidity, price change  
✅ Very simple API

**Cons:**
❌ Rate limited (300 requests/minute)  
❌ Less reliable than paid services  
❌ Data might be slightly delayed

**Time to Implement:** 2-3 hours  
**Reliability:** Medium  
**Cost:** Free (with rate limits)

**DexScreener API Docs:** https://docs.dexscreener.com/

---

### **Option 4: Direct On-Chain Queries via Helius RPC** (Advanced)

**How It Works:**
- Query DEX pool accounts directly on Solana blockchain
- Calculate prices from reserve ratios in each pool
- Most accurate, real-time data possible

**Implementation:**
```typescript
// Query Orca Whirlpool for SOL/USDC
const whirlpoolAccount = await helius.getAccountInfo(ORCA_SOL_USDC_POOL);
const reserves = parseWhirlpoolData(whirlpoolAccount);
const orcaPrice = reserves.tokenB / reserves.tokenA;

// Query Raydium AMM for SOL/USDC  
const raydiumAccount = await helius.getAccountInfo(RAYDIUM_SOL_USDC_POOL);
const raydiumReserves = parseRaydiumData(raydiumAccount);
const raydiumPrice = raydiumReserves.tokenB / raydiumReserves.tokenA;

// Compare prices
const arbOpportunity = Math.abs(orcaPrice - raydiumPrice) / orcaPrice;
```

**Pros:**
✅ Most accurate real-time data  
✅ No third-party API dependencies  
✅ No rate limits (we control RPC)  
✅ We already have Helius API key  
✅ Can monitor mempool for sandwich opportunities

**Cons:**
❌ Complex implementation (need to understand each DEX's program structure)  
❌ Requires pool address discovery  
❌ Math-heavy (reserve ratio calculations)  
❌ Need to handle different pool types (CPMMs, CLMMs, etc.)  
❌ Higher latency for multiple queries

**Time to Implement:** 1-2 weeks  
**Reliability:** Highest (direct source)  
**Cost:** Covered by existing Helius key

**Required Knowledge:**
- Orca Whirlpool program structure
- Raydium AMM v4 account layout
- Meteora DLMM pool parsing
- Solana account deserialization

---

### **Option 5: Use Existing MEV/Arbitrage Services** (Integration Partner)

**How It Works:**
- Integrate with existing MEV infrastructure providers
- Services like Jito, Triton, or specialized arbitrage APIs

**Examples:**
- **Jito MEV Dashboard API**: Real MEV opportunities from their bundles
- **Triton**: Premium RPC with MEV detection features
- **Solana FM**: Transaction analysis with MEV detection

**Pros:**
✅ Battle-tested MEV detection  
✅ Professional-grade infrastructure  
✅ May include execution capabilities  
✅ Handles complexity for us

**Cons:**
❌ Expensive ($500-$5000/month)  
❌ Less control over data  
❌ May not fit our use case (we want discovery, not execution)

**Time to Implement:** Varies (1-2 weeks for integration)  
**Reliability:** Very High  
**Cost:** High

---

## 📊 Recommended Implementation Strategy

### **Phase 1: Quick Win (This Week)** ⭐
**Implement Jupiter Quote API with DEX filters**

**Why:**
- Fastest to implement (2-4 hours)
- Uses infrastructure we already trust
- Gets us real arbitrage data immediately
- Can iterate and improve later

**Action Items:**
1. ✅ Replace current price API call with quote API
2. ✅ Add parallel quote requests for Jupiter, Orca, Raydium
3. ✅ Calculate arbitrage from quote differences
4. ✅ Add proper error handling and timeouts
5. ✅ Test with SOL, BONK, JUP, USDC pairs
6. ✅ Deploy and monitor for 24 hours

**Success Criteria:**
- Scanner returns 2-5 real arbitrage opportunities per scan
- Response time < 5 seconds
- No timeouts or 500 errors

---

### **Phase 2: Reliability Layer (Next Week)**
**Add Birdeye or DexScreener as fallback**

**Why:**
- Adds redundancy if Jupiter has issues
- Single API call = faster
- More comprehensive DEX coverage

**Action Items:**
1. ✅ Sign up for Birdeye API key (free tier)
2. ✅ Implement Birdeye multi-price endpoint
3. ✅ Add fallback logic: Try Jupiter first, use Birdeye if fails
4. ✅ Add caching layer (5-10 second cache)
5. ✅ Compare results between Jupiter and Birdeye for accuracy

**Success Criteria:**
- 99% uptime (even if one API is down)
- Average response time < 3 seconds
- Accurate arbitrage detection validated against manual checks

---

### **Phase 3: Advanced Features (Future)**
**Direct on-chain queries + execution capabilities**

**Why:**
- Most accurate data possible
- Enables auto-execution features
- Positions us as premium MEV tool

**Action Items:**
1. ✅ Implement Orca Whirlpool queries via Helius
2. ✅ Add Raydium AMM pool parsing
3. ✅ Build mempool monitoring (sandwich detection)
4. ✅ Add one-click execution via Jupiter Swap API
5. ✅ Implement position sizing and risk management

**Success Criteria:**
- Sub-second latency on price checks
- Catch opportunities before they appear on aggregators
- Successful auto-execution with positive P/L

---

## 🔧 Technical Implementation Details

### **Jupiter Quote API Example (Phase 1)**

```typescript
async function scanForMEV() {
  const pairs = [
    { input: "So11111111111111111111111111111111111111112", output: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "SOL/USDC" },
    { input: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", output: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "BONK/USDC" },
  ];
  
  const dexes = ["Orca", "Raydium", "Meteora"];
  const opportunities = [];
  
  for (const pair of pairs) {
    const quotes: Record<string, any> = {};
    
    // Fetch quotes from each DEX in parallel
    const quotePromises = dexes.map(async (dex) => {
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${pair.input}&outputMint=${pair.output}&amount=1000000000&slippageBps=50&onlyDirectRoutes=true&dexes=${dex}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      return { dex, data };
    });
    
    const results = await Promise.allSettled(quotePromises);
    
    // Parse successful quotes
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { dex, data } = result.value;
        if (data.outAmount) {
          quotes[dex] = {
            price: Number(data.outAmount) / 1_000_000_000,
            route: data.routePlan?.[0]?.swapInfo?.label || dex,
          };
        }
      }
    }
    
    // Find arbitrage opportunities
    const dexNames = Object.keys(quotes);
    for (let i = 0; i < dexNames.length; i++) {
      for (let j = i + 1; j < dexNames.length; j++) {
        const dex1 = dexNames[i];
        const dex2 = dexNames[j];
        const price1 = quotes[dex1].price;
        const price2 = quotes[dex2].price;
        
        const profitPercent = Math.abs((price2 - price1) / price1) * 100;
        
        if (profitPercent > 0.5) { // Min 0.5% profit
          const buyDex = price1 < price2 ? dex1 : dex2;
          const sellDex = price1 < price2 ? dex2 : dex1;
          
          opportunities.push({
            id: `arb-${pair.symbol}-${Date.now()}`,
            type: "arbitrage",
            token: pair.symbol,
            buyDex,
            sellDex,
            buyPrice: Math.min(price1, price2),
            sellPrice: Math.max(price1, price2),
            profitPercent: profitPercent.toFixed(2),
            profitUsd: (profitPercent * Math.min(price1, price2) * 10).toFixed(2),
            tradeSize: 10,
            gasEstimate: 0.001,
            confidence: profitPercent > 1 ? "high" : "medium",
            expiresIn: 15,
          });
        }
      }
    }
  }
  
  return {
    opportunities: opportunities.slice(0, 10),
    scannedAt: Date.now(),
    nextScanIn: 5,
  };
}
```

---

### **Birdeye API Example (Phase 2)**

```typescript
async function scanWithBirdeye() {
  const mints = [
    "So11111111111111111111111111111111111111112", // SOL
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // JUP
  ];
  
  const res = await fetch(
    `https://public-api.birdeye.so/defi/multi_price?list_address=${mints.join(',')}&include_liquidity=true`,
    {
      headers: {
        'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  
  const data = await res.json();
  
  // data.data structure:
  // {
  //   "So1111...": {
  //     "value": 150.23,
  //     "priceByDex": {
  //       "Orca": 149.80,
  //       "Raydium": 150.50,
  //       "Jupiter": 150.10
  //     }
  //   }
  // }
  
  const opportunities = [];
  
  for (const mint of mints) {
    const tokenData = data.data[mint];
    if (!tokenData?.priceByDex) continue;
    
    const prices = tokenData.priceByDex;
    const dexNames = Object.keys(prices);
    
    // Compare all DEX pairs
    for (let i = 0; i < dexNames.length; i++) {
      for (let j = i + 1; j < dexNames.length; j++) {
        const price1 = prices[dexNames[i]];
        const price2 = prices[dexNames[j]];
        
        const profitPercent = Math.abs((price2 - price1) / price1) * 100;
        
        if (profitPercent > 0.5) {
          opportunities.push({
            // ... same structure as Jupiter example
          });
        }
      }
    }
  }
  
  return opportunities;
}
```

---

## 📈 Expected Outcomes

### **Phase 1 (Jupiter Quotes):**
- **Real arbitrage opportunities**: 2-10 per scan
- **Typical profit range**: 0.5% - 3%
- **Response time**: 3-5 seconds
- **Accuracy**: High (Jupiter's routing is battle-tested)
- **Cost**: Free (within rate limits)

### **Phase 2 (Birdeye Fallback):**
- **Uptime**: 99%+
- **Response time**: 2-3 seconds (single API call)
- **DEX coverage**: 10+ DEXs
- **Accuracy**: Very High (aggregated from multiple sources)
- **Cost**: $0-$49/month depending on usage

### **Phase 3 (On-Chain + Execution):**
- **Latency**: <1 second
- **Accuracy**: Highest (direct on-chain data)
- **Features**: Auto-execute, mempool monitoring, sandwich detection
- **Cost**: Covered by Helius RPC (already paying)

---

## 🎯 Success Metrics

**User-Facing:**
- ✅ Show 5-10 real arbitrage opportunities on every scan
- ✅ Update opportunities every 10 seconds
- ✅ Profit estimates accurate within 10%
- ✅ Zero timeout errors in production

**Technical:**
- ✅ API response time < 5 seconds (P95)
- ✅ 99% uptime
- ✅ Successful fallback when primary API fails
- ✅ Cache hit rate > 80% (reduce API calls)

**Business:**
- ✅ MEV Scanner becomes #1 most-used feature
- ✅ Users share profitable trades on social media
- ✅ Positioning as "pro trader tool" attracts institutional users

---

## 🚀 Next Steps

### **Today:**
1. Choose Phase 1 or Phase 2 implementation
2. Get API keys if needed (Birdeye, DexScreener)
3. Write implementation code
4. Test locally with real Solana tokens
5. Deploy to Netlify

### **This Week:**
1. Monitor production for 48 hours
2. Collect user feedback
3. Fix any bugs or timeout issues
4. Document findings

### **Next Week:**
1. Implement redundancy/fallback layer
2. Add caching to reduce API costs
3. Optimize for speed
4. Start Phase 3 research

---

## 🤔 Open Questions

1. **Which approach should we start with?** Jupiter Quotes or Birdeye?
2. **What's our budget for paid APIs?** (Birdeye Pro is $49/month)
3. **Do we want auto-execution eventually?** (Affects architecture decisions)
4. **Should we focus on specific token pairs?** (SOL, BONK, JUP) or scan widely?
5. **How do we verify arbitrage is real?** (Need backtesting/paper trading)

---

**Ready to implement? Let me know which phase you want to tackle first!** 🚀
