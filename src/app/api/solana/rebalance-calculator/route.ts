import { NextResponse } from "next/server";
import { getJupiterQuote } from "@/lib/jupiter-executor";

export const dynamic = "force-dynamic";

interface TokenHolding {
  mint: string;
  symbol: string;
  amount: number;
  valueUSD: number;
  decimals: number;
}

interface AllocationTarget {
  symbol: string;
  targetPercent: number;
  mint?: string;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_DECIMALS = 9;
const AVG_GAS_PER_SWAP = 0.000565; // ~565 lamports per swap

export async function POST(req: Request) {
  try {
    const { currentHoldings, targetAllocations, totalPortfolioValue } = await req.json();

    if (!currentHoldings || !Array.isArray(currentHoldings)) {
      return NextResponse.json({ error: "Invalid currentHoldings" }, { status: 400 });
    }

    if (!targetAllocations || !Array.isArray(targetAllocations)) {
      return NextResponse.json({ error: "Invalid targetAllocations" }, { status: 400 });
    }

    // Normalize targets (filter out 0% allocations)
    const activeTargets = targetAllocations.filter((t) => t.targetPercent > 0);

    // Build current state map
    const currentState = new Map<string, TokenHolding>();
    currentHoldings.forEach((h: TokenHolding) => {
      currentState.set(h.symbol, h);
    });

    // Calculate current allocations
    const currentAllocations = new Map<string, number>();
    currentHoldings.forEach((h: TokenHolding) => {
      const percent = (h.valueUSD / totalPortfolioValue) * 100;
      currentAllocations.set(h.symbol, percent);
    });

    // Find trades needed
    const trades: Array<{
      fromSymbol: string;
      toSymbol: string;
      fromAmount: number;
      estimatedToAmount: number;
      slippagePercent: number;
      gasCost: number;
      fromMint: string;
      toMint: string;
    }> = [];

    // Step 1: Convert over-allocated tokens to SOL
    for (const [symbol, current] of currentAllocations) {
      const target = activeTargets.find((t) => t.symbol === symbol)?.targetPercent || 0;

      if (current > target) {
        // Need to sell this token
        const holdingData = currentState.get(symbol);
        if (!holdingData) continue;

        const amountToSell = ((current - target) / 100) * totalPortfolioValue;
        const tokens = (amountToSell / holdingData.valueUSD) * holdingData.amount;

        // Get quote for SOL
        const quote = await getJupiterQuote(
          holdingData.mint,
          SOL_MINT,
          Math.round(tokens * Math.pow(10, holdingData.decimals)),
          50
        );

        if (quote && quote.outAmount) {
          trades.push({
            fromSymbol: symbol,
            toSymbol: "SOL",
            fromAmount: tokens,
            estimatedToAmount: parseInt(quote.outAmount) / Math.pow(10, SOL_DECIMALS),
            slippagePercent: parseFloat(quote.priceImpactPct || "0"),
            gasCost: AVG_GAS_PER_SWAP,
            fromMint: holdingData.mint,
            toMint: SOL_MINT,
          });
        }
      }
    }

    // Step 2: Convert SOL to under-allocated tokens
    for (const target of activeTargets) {
      const current = currentAllocations.get(target.symbol) || 0;

      if (current < target.targetPercent) {
        const holdingData = currentState.get(target.symbol);
        if (!holdingData || !target.mint) continue;

        const amountNeeded = ((target.targetPercent - current) / 100) * totalPortfolioValue;

        // Find SOL amount from previous trades
        const solFromTrades = trades
          .filter((t) => t.toSymbol === "SOL")
          .reduce((sum, t) => sum + t.estimatedToAmount, 0);

        // Get quote for this token
        const quote = await getJupiterQuote(
          SOL_MINT,
          target.mint,
          Math.round(amountNeeded * Math.pow(10, SOL_DECIMALS) * 0.995), // Account for slippage
          50
        );

        if (quote && quote.outAmount) {
          const solNeeded = (parseInt(quote.outAmount) / holdingData.amount) * Math.pow(10, SOL_DECIMALS);
          trades.push({
            fromSymbol: "SOL",
            toSymbol: target.symbol,
            fromAmount: solNeeded / Math.pow(10, SOL_DECIMALS),
            estimatedToAmount: parseInt(quote.outAmount) / Math.pow(10, holdingData.decimals),
            slippagePercent: parseFloat(quote.priceImpactPct || "0"),
            gasCost: AVG_GAS_PER_SWAP,
            fromMint: SOL_MINT,
            toMint: target.mint,
          });
        }
      }
    }

    // Calculate metrics
    const totalGasCost = trades.reduce((sum, t) => sum + t.gasCost, 0);
    const totalGasSavings = totalGasCost * 52; // Rough estimate: bundle saves ~60% gas, ~52 weeks/year

    // Calculate drift before and after
    let currentDrift = 0;
    for (const target of activeTargets) {
      const current = currentAllocations.get(target.symbol) || 0;
      currentDrift += Math.abs(target.targetPercent - current);
    }

    let projectedDrift = 0;
    const projectedAllocations = new Map(currentAllocations);
    for (const trade of trades) {
      // Simulate trade impact
      const fromCurrent = projectedAllocations.get(trade.fromSymbol) || 0;
      const toCurrent = projectedAllocations.get(trade.toSymbol) || 0;

      projectedAllocations.set(trade.fromSymbol, fromCurrent - (trade.fromAmount / totalPortfolioValue) * 100);
      projectedAllocations.set(trade.toSymbol, toCurrent + (trade.estimatedToAmount / totalPortfolioValue) * 100);
    }

    for (const target of activeTargets) {
      const projected = projectedAllocations.get(target.symbol) || 0;
      projectedDrift += Math.abs(target.targetPercent - projected);
    }

    return NextResponse.json(
      {
        trades: trades.map((t) => ({
          fromSymbol: t.fromSymbol,
          toSymbol: t.toSymbol,
          fromAmount: t.fromAmount,
          estimatedToAmount: t.estimatedToAmount,
          slippagePercent: t.slippagePercent,
          gasCost: t.gasCost,
        })),
        totalGasSavings,
        totalRebalanceGasCost: totalGasCost,
        currentDrift,
        projectedDrift,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Rebalance calculator error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
