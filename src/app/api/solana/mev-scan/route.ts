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
              const sellPair = price1 < price2 ? pair2 : pair1;

              // Validate with Jupiter Quote API for actual executable price
              let jupiterValidated = false;
              let realProfit = profitPercent;
              
              try {
                // Get Jupiter quote for a small trade (1 token)
                const amount = token.symbol === 'SOL' ? 1000000000 : // 1 SOL
                              token.symbol === 'BONK' ? 1000000000000 : // 1000 BONK
                              1000000000; // 1 token
                
                const quoteController = new AbortController();
                const quoteTimeout = setTimeout(() => quoteController.abort(), 3000);
                
                const jupiterQuote = await fetch(
                  `https://quote-api.jup.ag/v6/quote?inputMint=${token.mint}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amount}&slippageBps=50`,
                  { signal: quoteController.signal }
                );
                
                clearTimeout(quoteTimeout);
                
                if (jupiterQuote.ok) {
                  const quote = await jupiterQuote.json();
                  const jupiterPrice = parseFloat(quote.outAmount) / amount;
                  
                  // Recalculate profit based on Jupiter's executable price
                  const adjustedProfit = Math.abs((sellPrice - jupiterPrice) / jupiterPrice * 100);
                  
                  if (adjustedProfit >= minProfit * 0.7) { // Allow 30% slippage tolerance
                    jupiterValidated = true;
                    realProfit = adjustedProfit;
                  }
                }
              } catch (jupiterError) {
                // If Jupiter fails, use DexScreener data (still reliable)
                jupiterValidated = false;
              }

              // Calculate actual profit: (sell price - buy price) / buy price * 100
              const actualProfitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
              
              // Calculate profit in USD for a $100 trade
              const tradeAmount = 100; // $100 trade
              const profitInUsd = (actualProfitPercent / 100) * tradeAmount;

              opportunities.push({
                id: `arb-${token.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
                type: "arbitrage",
                token: `${token.symbol}/USDC`,
                buyDex: buyDex.charAt(0).toUpperCase() + buyDex.slice(1),
                sellDex: sellDex.charAt(0).toUpperCase() + sellDex.slice(1),
                buyPrice,
                sellPrice,
                profitPercent: actualProfitPercent.toFixed(2),
                profitUsd: profitInUsd.toFixed(2),
                tradeSize: tradeAmount,
                gasEstimate: 0.001,
                confidence: jupiterValidated && actualProfitPercent > 1.5 ? "high" : 
                           jupiterValidated && actualProfitPercent > 0.8 ? "medium" : "low",
                expiresIn: Math.floor(Math.random() * 15) + 5,
                liquidity: Math.min(buyPair.liquidity?.usd || 0, sellPair.liquidity?.usd || 0),
                volume24h: buyPair.volume?.h24 || 0,
                priceChange24h: buyPair.priceChange?.h24 || 0,
                verified: jupiterValidated,
                buyPairAddress: buyPair.pairAddress,
                sellPairAddress: sellPair.pairAddress,
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

    // Sort by profit potential and confidence
    opportunities.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return parseFloat(b.profitPercent) - parseFloat(a.profitPercent);
    });

    const verifiedCount = opportunities.filter(o => o.verified).length;

    return NextResponse.json({
      opportunities: opportunities.slice(0, 10), // Top 10 opportunities
      scannedAt: Date.now(),
      nextScanIn: 5,
      source: "dexscreener + jupiter",
      stats: {
        total: opportunities.length,
        verified: verifiedCount,
        unverified: opportunities.length - verifiedCount,
      }
    }, { status: 200 });

  } catch (e: any) {
    console.error("MEV scan error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
