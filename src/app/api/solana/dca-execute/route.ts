import { NextResponse } from "next/server";
import { getJupiterQuote, executeSwap } from "@/lib/jupiter-executor";

export const dynamic = "force-dynamic";

/**
 * Manual DCA Bot Execution Endpoint
 * Allows users to manually trigger a DCA bot execution
 * Returns swap transaction for user to sign
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { botId, walletAddress, action } = body;

    if (!botId || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: botId, walletAddress" },
        { status: 400 }
      );
    }

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json({
        success: true,
        action: action || "prepare",
        message: "MOCK: DCA execution prepared",
        swapParams: {
          inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
          outputMint: "So11111111111111111111111111111111111111112", // SOL
          amount: 10000000, // 10 USDC
          slippage: 50, // 0.5%
        },
        jupiterUrl: "https://jup.ag/swap/USDC-SOL",
        mockData: true,
      }, { status: 200 });
    }

    // In Phase 2, this would:
    // 1. Fetch bot configuration from database
    // 2. Get Jupiter quote for the swap
    // 3. Prepare swap transaction
    // 4. Return transaction for user to sign
    // 5. OR submit to delegation service if enabled

    // For now, return instructions
    return NextResponse.json({
      success: true,
      action: "manual_execution_required",
      message: "DCA bot execution ready - approve in your wallet",
      instructions: {
        step1: "Connect your wallet",
        step2: "Review the swap details below",
        step3: "Click 'Execute DCA Trade' to approve the transaction",
        step4: "Confirm the transaction in your wallet",
      },
      nextSteps: {
        automated: "Enable delegation to allow automated execution",
        manual: "Keep executing manually on schedule",
      },
      jupiterIntegration: {
        terminal: "Use Jupiter Terminal widget for in-app swaps",
        api: "Direct API integration for delegation",
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error("DCA execution error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/**
 * GET endpoint to check execution status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const botId = searchParams.get("botId");

    if (!botId) {
      return NextResponse.json({ error: "Missing botId parameter" }, { status: 400 });
    }

    // Mock mode
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json({
        botId,
        status: "ready",
        nextExecution: Date.now() + 3600000, // 1 hour from now
        lastExecution: Date.now() - 86400000, // 1 day ago
        canExecuteNow: true,
        message: "MOCK: Bot ready for execution",
      }, { status: 200 });
    }

    // In production, fetch from database
    return NextResponse.json({
      botId,
      status: "not_implemented",
      message: "Check database for bot status",
    }, { status: 501 });

  } catch (e: any) {
    console.error("Status check error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
