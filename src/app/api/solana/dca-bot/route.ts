import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// DCA Bot - Create and manage Dollar-Cost Averaging strategies
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "list"; // list, get, create, execute

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode || action === "list") {
      return NextResponse.json({
        bots: [
          {
            id: "dca-1",
            name: "SOL Weekly DCA",
            status: "active",
            fromToken: "USDC",
            toToken: "SOL",
            amount: 100, // USDC per execution
            frequency: "weekly", // daily, weekly, monthly
            nextExecution: Date.now() + 1000 * 60 * 60 * 24 * 3, // 3 days
            totalInvested: 800,
            totalReceived: 5.45, // SOL
            avgPrice: 146.79,
            currentPrice: 150.12,
            pnlPercent: 2.27,
            executionCount: 8,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60, // 60 days ago
          },
          {
            id: "dca-2",
            name: "JUP Monthly Stack",
            status: "active",
            fromToken: "USDC",
            toToken: "JUP",
            amount: 50,
            frequency: "monthly",
            nextExecution: Date.now() + 1000 * 60 * 60 * 24 * 15,
            totalInvested: 150,
            totalReceived: 125.5,
            avgPrice: 1.19,
            currentPrice: 1.25,
            pnlPercent: 5.04,
            executionCount: 3,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90,
          },
          {
            id: "dca-3",
            name: "BONK Daily Drip",
            status: "paused",
            fromToken: "USDC",
            toToken: "BONK",
            amount: 10,
            frequency: "daily",
            nextExecution: null,
            totalInvested: 200,
            totalReceived: 9_800_000_000,
            avgPrice: 0.0000204,
            currentPrice: 0.0000210,
            pnlPercent: 2.94,
            executionCount: 20,
            createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
          },
        ],
        summary: {
          totalBots: 3,
          activeBots: 2,
          totalInvested: 1150,
          totalValue: 1185.50,
          overallPnl: 3.09,
        },
      }, { status: 200 });
    }

    // For create/update actions, would need POST endpoint
    return NextResponse.json({
      error: "Action not supported in GET. Use POST for create/update/execute.",
    }, { status: 400 });

  } catch (e: any) {
    console.error("DCA bot error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

// Create or manage DCA bots
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action; // create, pause, resume, execute, delete

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      if (action === "create") {
        return NextResponse.json({
          success: true,
          bot: {
            id: `dca-${Date.now()}`,
            name: body.name || "New DCA Bot",
            status: "active",
            fromToken: body.fromToken,
            toToken: body.toToken,
            amount: body.amount,
            frequency: body.frequency,
            nextExecution: Date.now() + 1000 * 60 * 60 * 24, // 1 day
            totalInvested: 0,
            totalReceived: 0,
            executionCount: 0,
            createdAt: Date.now(),
          },
        }, { status: 200 });
      }

      if (action === "execute") {
        return NextResponse.json({
          success: true,
          execution: {
            botId: body.botId,
            timestamp: Date.now(),
            fromAmount: 100,
            toAmount: 0.67,
            price: 149.25,
            txnSignature: "5xK..." + Date.now(),
          },
        }, { status: 200 });
      }

      return NextResponse.json({
        success: true,
        message: `Action ${action} completed`,
      }, { status: 200 });
    }

    // Real implementation would:
    // 1. Store bot config in database
    // 2. Schedule execution via cron/queue system
    // 3. Execute swaps via Jupiter API
    // 4. Track performance & notify user
    // 5. Handle errors & retries

    return NextResponse.json({
      error: "Real DCA execution not implemented yet. Use MOCK_MODE for testing.",
    }, { status: 501 });

  } catch (e: any) {
    console.error("DCA bot POST error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
