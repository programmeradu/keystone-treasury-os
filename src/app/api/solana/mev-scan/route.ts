import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// MEV Opportunity Scanner - Finds arbitrage opportunities across Solana DEXs
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const minProfit = Number(searchParams.get("minProfit") || "0.5"); // Minimum profit % threshold

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json({
        opportunities: [
          {
            id: "arb-1",
            type: "arbitrage",
            token: "SOL/USDC",
            buyDex: "Orca",
            sellDex: "Raydium",
            buyPrice: 149.80,
            sellPrice: 151.20,
            profitPercent: 0.93,
            profitUsd: 140,
            tradeSize: 100, // SOL
            gasEstimate: 0.001, // SOL
            confidence: "high",
            expiresIn: 12, // seconds
          },
          {
            id: "arb-2",
            type: "arbitrage",
            token: "BONK/USDC",
            buyDex: "Jupiter",
            sellDex: "Meteora",
            buyPrice: 0.0000205,
            sellPrice: 0.0000211,
            profitPercent: 2.9,
            profitUsd: 58,
            tradeSize: 100_000_000, // BONK
            gasEstimate: 0.0015,
            confidence: "medium",
            expiresIn: 8,
          },
          {
            id: "sandwich-1",
            type: "sandwich_risk",
            token: "JUP/USDC",
            targetTxn: "5aB...",
            frontrunProfit: 25,
            confidence: "low",
            warning: "Pending large buy detected - potential sandwich risk",
          },
        ],
        scannedAt: Date.now(),
        nextScanIn: 5, // seconds
      }, { status: 200 });
    }

    // Real implementation using DexScreener API
    // Get cross-DEX prices for multiple tokens - FREE, no API key needed!
    const opportunities: any[] = [];

    // Token mints to scan
    const tokens = [
      { mint: "So11111111111111111111111111111111111111112", symbol: "SOL" },
      { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK" },
      { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP" },
      { mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", symbol: "ORCA" },
    ];

    // Scan each token for cross-DEX arbitrage opportunities
    for (const token of tokens) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Fetch all pairs for this token from DexScreener
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token.mint}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const pairs = data.pairs || [];

        // Filter for Solana DEX pairs with good liquidity
        const solanaPairs = pairs.filter((pair: any) => 
          pair.chainId === 'solana' && 
          pair.liquidity?.usd > 10000 && // At least $10k liquidity
          pair.priceUsd
        );

        if (solanaPairs.length < 2) continue;

        // Compare prices across different DEXs
        for (let i = 0; i < solanaPairs.length; i++) {
          for (let j = i + 1; j < solanaPairs.length; j++) {
            const pair1 = solanaPairs[i];
            const pair2 = solanaPairs[j];

            // Skip if same DEX
            if (pair1.dexId === pair2.dexId) continue;

            const price1 = parseFloat(pair1.priceUsd);
            const price2 = parseFloat(pair2.priceUsd);

            if (!price1 || !price2) continue;

            const profitPercent = Math.abs((price2 - price1) / price1 * 100);

            if (profitPercent >= minProfit) {
              const buyDex = price1 < price2 ? pair1.dexId : pair2.dexId;
              const sellDex = price1 < price2 ? pair2.dexId : pair1.dexId;
              const buyPrice = Math.min(price1, price2);
              const sellPrice = Math.max(price1, price2);
              const buyPair = price1 < price2 ? pair1 : pair2;

              opportunities.push({
                id: `arb-${token.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
                type: "arbitrage",
                token: `${token.symbol}/USDC`,
                buyDex: buyDex.charAt(0).toUpperCase() + buyDex.slice(1),
                sellDex: sellDex.charAt(0).toUpperCase() + sellDex.slice(1),
                buyPrice,
                sellPrice,
                profitPercent: profitPercent.toFixed(2),
                profitUsd: (profitPercent * buyPrice * 10).toFixed(2),
                tradeSize: 10,
                gasEstimate: 0.001,
                confidence: profitPercent > 1.5 ? "high" : profitPercent > 0.8 ? "medium" : "low",
                expiresIn: Math.floor(Math.random() * 15) + 5,
                liquidity: buyPair.liquidity?.usd || 0,
                volume24h: buyPair.volume?.h24 || 0,
                priceChange24h: buyPair.priceChange?.h24 || 0,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${token.symbol}:`, error);
        // Continue with next token
        continue;
      }
    }

    return NextResponse.json({
      opportunities: opportunities.slice(0, 10), // Top 10 opportunities
      scannedAt: Date.now(),
      nextScanIn: 5,
      source: "dexscreener",
    }, { status: 200 });

  } catch (e: any) {
    console.error("MEV scan error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
