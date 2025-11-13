import { NextResponse } from "next/server";
import { getJupiterQuote } from "@/lib/jupiter-executor";

export const dynamic = "force-dynamic";

interface RebalanceTrade {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  estimatedToAmount: number;
  slippagePercent: number;
  gasCost: number;
}

/**
 * Execute Rebalance
 * This is a simulation endpoint. In production, it would:
 * 1. Get fresh Jupiter quotes
 * 2. Construct swap transactions
 * 3. Bundle them with Jito
 * 4. Return transaction signatures
 */
export async function POST(req: Request) {
  try {
    const { trades, walletAddress } = await req.json();

    if (!Array.isArray(trades)) {
      return NextResponse.json({ error: "Invalid trades array" }, { status: 400 });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing walletAddress" }, { status: 400 });
    }

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json(
        {
          success: true,
          signature: "5YRb2n5V2M7X3K1Z9L4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4J5K",
          tradesExecuted: trades.length,
          totalGasCost: trades.reduce((sum: number, t: RebalanceTrade) => sum + t.gasCost, 0),
          status: "pending",
          message: "Rebalance transactions submitted to blockchain",
        },
        { status: 200 }
      );
    }

    // In production, you would:
    // 1. Get fresh quotes for each trade
    // 2. Build swap instructions
    // 3. Bundle with Jito for better pricing
    // 4. Sign with user's wallet (requires browser integration)
    // 5. Submit bundle

    const executionDetails = {
      tradesCount: trades.length,
      estimatedGasCost: trades.reduce((sum: number, t: RebalanceTrade) => sum + t.gasCost, 0),
      totalValue: trades.reduce((sum: number, t: RebalanceTrade) => sum + t.estimatedToAmount, 0),
    };

    return NextResponse.json(
      {
        success: true,
        signature: null, // Would be real signature from blockchain
        executionDetails,
        status: "simulation_only",
        message: "This is a simulation. Real execution requires wallet connection and on-chain signing.",
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("Execute rebalance error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
