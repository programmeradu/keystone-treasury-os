import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TokenTransaction {
  mint: string;
  symbol: string;
  amount: number;
  priceAtPurchase: number;
  purchaseDate: number;
  type: "buy" | "sell";
}

interface TaxAnalysis {
  capitalGains: {
    shortTerm: number;
    longTerm: number;
    total: number;
  };
  washSaleRisks: Array<{
    symbol: string;
    riskLevel: "high" | "medium" | "low";
    message: string;
    daysSinceSale?: number;
  }>;
  taxLossHarvestingOpportunities: Array<{
    symbol: string;
    currentValue: number;
    costBasis: number;
    loss: number;
    daysHeld: number;
    recommendation: string;
  }>;
  rebalanceTaxImpact: {
    estimatedTaxLiability: number;
    taxableEvents: number;
    taxOptimizedStrategy?: string;
  };
}

interface RebalanceTrade {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  estimatedToAmount: number;
}

interface TokenHolding {
  mint: string;
  symbol: string;
  amount: number;
  valueUSD: number;
  decimals: number;
  costBasis?: number;
  purchaseDate?: number;
  transactions?: TokenTransaction[];
}

/**
 * Tax-Aware Analysis for Portfolio Rebalancing
 * Provides capital gains tracking, wash sale detection, and tax-loss harvesting opportunities
 */
export async function POST(req: Request) {
  try {
    const { holdings, rebalanceTrades, userTransactionHistory } = await req.json();

    if (!Array.isArray(holdings)) {
      return NextResponse.json({ error: "Invalid holdings array" }, { status: 400 });
    }

    const analysis: TaxAnalysis = {
      capitalGains: {
        shortTerm: 0,
        longTerm: 0,
        total: 0,
      },
      washSaleRisks: [],
      taxLossHarvestingOpportunities: [],
      rebalanceTaxImpact: {
        estimatedTaxLiability: 0,
        taxableEvents: 0,
      },
    };

    const now = Date.now();
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const WASH_SALE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Analyze each holding for tax implications
    for (const holding of holdings) {
      if (!holding.purchaseDate || !holding.costBasis) continue;

      const holdingPeriodMs = now - holding.purchaseDate;
      const isLongTerm = holdingPeriodMs > ONE_YEAR_MS;
      const currentGain = holding.valueUSD - holding.costBasis;

      // Calculate capital gains
      if (currentGain > 0) {
        if (isLongTerm) {
          analysis.capitalGains.longTerm += currentGain;
        } else {
          analysis.capitalGains.shortTerm += currentGain;
        }
        analysis.capitalGains.total += currentGain;
      }

      // Check for wash sale risks
      if (holding.transactions) {
        const recentSales = holding.transactions.filter(
          (t: TokenTransaction) => t.type === "sell" && now - t.purchaseDate < WASH_SALE_WINDOW_MS
        );

        if (recentSales.length > 0) {
          const daysSinceSale = Math.floor((now - recentSales[recentSales.length - 1].purchaseDate) / (24 * 60 * 60 * 1000));
          const isHighRisk = daysSinceSale < 15;
          const isMediumRisk = daysSinceSale < 30;

          analysis.washSaleRisks.push({
            symbol: holding.symbol,
            riskLevel: isHighRisk ? "high" : isMediumRisk ? "medium" : "low",
            message: isHighRisk
              ? `Sold ${daysSinceSale} days ago - repurchase may trigger wash sale`
              : `Sold ${daysSinceSale} days ago - verify 30-day window`,
            daysSinceSale,
          });
        }
      }

      // Find tax-loss harvesting opportunities
      if (currentGain < 0) {
        const daysHeld = Math.floor(holdingPeriodMs / (24 * 60 * 60 * 1000));
        analysis.taxLossHarvestingOpportunities.push({
          symbol: holding.symbol,
          currentValue: holding.valueUSD,
          costBasis: holding.costBasis,
          loss: Math.abs(currentGain),
          daysHeld,
          recommendation:
            daysHeld >= 30
              ? "Ready to harvest - no wash sale risk"
              : `Wait ${30 - daysHeld} days to avoid wash sale risk`,
        });
      }
    }

    // Analyze tax impact of rebalancing trades
    if (rebalanceTrades && Array.isArray(rebalanceTrades)) {
      let taxableEvents = 0;
      let estimatedTax = 0;

      for (const trade of rebalanceTrades as RebalanceTrade[]) {
        const fromHolding = holdings.find((h: TokenHolding) => h.symbol === trade.fromSymbol);
        if (!fromHolding || !fromHolding.costBasis) continue;

        taxableEvents++;

        // Estimate capital gains tax (simplified: assume 37% long-term or 40% short-term)
        const holdingPeriodMs = now - (fromHolding.purchaseDate || now);
        const isLongTerm = holdingPeriodMs > ONE_YEAR_MS;
        const taxRate = isLongTerm ? 0.15 : 0.40; // Long-term: 15%, Short-term: 40%

        const gainOnTrade = trade.estimatedToAmount - (fromHolding.costBasis * trade.fromAmount);
        const gainTax = Math.max(0, gainOnTrade * taxRate);

        estimatedTax += gainTax;
      }

      analysis.rebalanceTaxImpact.taxableEvents = taxableEvents;
      analysis.rebalanceTaxImpact.estimatedTaxLiability = estimatedTax;

      // Suggest tax-optimized strategy
      if (analysis.taxLossHarvestingOpportunities.length > 0) {
        const harvestableValue = analysis.taxLossHarvestingOpportunities.reduce((sum, h) => sum + h.loss, 0);
        analysis.rebalanceTaxImpact.taxOptimizedStrategy =
          `Consider harvesting ${harvestableValue.toFixed(2)} USD in losses to offset ${estimatedTax.toFixed(2)} USD in rebalance gains`;
      }
    }

    return NextResponse.json(analysis, { status: 200 });
  } catch (e: any) {
    console.error("Tax analysis error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
