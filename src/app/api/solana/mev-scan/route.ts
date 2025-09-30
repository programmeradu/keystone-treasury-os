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

    // Real implementation would:
    // 1. Query Jupiter, Orca, Raydium, Meteora for prices
    // 2. Calculate cross-DEX arbitrage opportunities
    // 3. Monitor pending transactions for sandwich opportunities
    // 4. Estimate gas & slippage
    // 5. Filter by minimum profit threshold

    const opportunities: any[] = [];

    // Query Jupiter for current prices
    const tokens = ["SOL", "USDC", "BONK", "JUP", "ORCA"];
    const jupiterRes = await fetch(`https://price.jup.ag/v6/price?ids=${tokens.join(",")}`, {
      next: { revalidate: 0 },
    });

    if (!jupiterRes.ok) {
      throw new Error("Failed to fetch prices from Jupiter");
    }

    const jupiterData = await jupiterRes.json();
    const prices = jupiterData.data || {};

    // Simulate finding arbitrage opportunities (simplified)
    // In production, you'd query multiple DEXs and compare prices
    for (const token of tokens) {
      if (token === "USDC") continue; // Skip stablecoin
      
      const basePrice = prices[token]?.price || 0;
      if (!basePrice) continue;

      // Simulate price differences across DEXs (±0.5-2%)
      const variance = (Math.random() - 0.5) * 0.04; // -2% to +2%
      const dex1Price = basePrice * (1 + variance);
      const dex2Price = basePrice * (1 - variance);
      
      const profitPercent = Math.abs((dex2Price - dex1Price) / dex1Price * 100);
      
      if (profitPercent >= minProfit) {
        const buyDex = variance > 0 ? "Orca" : "Jupiter";
        const sellDex = variance > 0 ? "Jupiter" : "Orca";
        
        opportunities.push({
          id: `arb-${token}-${Date.now()}`,
          type: "arbitrage",
          token: `${token}/USDC`,
          buyDex,
          sellDex,
          buyPrice: Math.min(dex1Price, dex2Price),
          sellPrice: Math.max(dex1Price, dex2Price),
          profitPercent: profitPercent.toFixed(2),
          profitUsd: (profitPercent * basePrice * 10).toFixed(2), // Assume 10 token trade
          tradeSize: 10,
          gasEstimate: 0.001,
          confidence: profitPercent > 1 ? "high" : profitPercent > 0.5 ? "medium" : "low",
          expiresIn: Math.floor(Math.random() * 15) + 5, // 5-20 seconds
        });
      }
    }

    return NextResponse.json({
      opportunities: opportunities.slice(0, 10), // Top 10
      scannedAt: Date.now(),
      nextScanIn: 5,
    }, { status: 200 });

  } catch (e: any) {
    console.error("MEV scan error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
