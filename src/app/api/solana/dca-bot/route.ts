import { NextResponse } from "next/server";
import { db } from "@/db";
import { dcaBots, dcaExecutions } from "@/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { getTokenPrice, calculateNextExecution } from "@/lib/jupiter-executor";

export const dynamic = "force-dynamic";

// DCA Bot - Create and manage Dollar-Cost Averaging strategies
export async function GET(req: Request) {
  try {
    // Check database connection
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "list";
    const userId = searchParams.get("userId") || "demo_user"; // TODO: Get from auth

    if (action === "list") {
      // Fetch all bots for user
      const bots = await db
        .select()
        .from(dcaBots)
        .where(eq(dcaBots.userId, userId))
        .orderBy(desc(dcaBots.createdAt));

      // Calculate current stats for each bot
      const botsWithStats = await Promise.all(
        bots.map(async (bot) => {
          // Get current price
          const currentPrice = await getTokenPrice(bot.buyTokenMint);
          
          // Calculate average price
          const avgPrice = bot.totalReceived > 0 
            ? bot.totalInvested / bot.totalReceived 
            : 0;
          
          // Calculate P/L
          const currentValue = currentPrice ? bot.totalReceived * currentPrice : 0;
          const pnlPercent = bot.totalInvested > 0
            ? ((currentValue - bot.totalInvested) / bot.totalInvested) * 100
            : 0;

          return {
            id: bot.id,
            name: bot.name,
            status: bot.status,
            fromToken: bot.paymentTokenSymbol,
            toToken: bot.buyTokenSymbol,
            amount: bot.amountUsd,
            frequency: bot.frequency,
            nextExecution: bot.nextExecution,
            totalInvested: bot.totalInvested,
            totalReceived: bot.totalReceived,
            avgPrice,
            currentPrice: currentPrice || 0,
            pnlPercent,
            executionCount: bot.executionCount,
            createdAt: bot.createdAt,
          };
        })
      );

      // Calculate summary
      const totalInvested = botsWithStats.reduce((sum, bot) => sum + bot.totalInvested, 0);
      const totalValue = botsWithStats.reduce((sum, bot) => {
        return sum + (bot.totalReceived * bot.currentPrice);
      }, 0);
      const overallPnl = totalInvested > 0 
        ? ((totalValue - totalInvested) / totalInvested) * 100 
        : 0;

      return NextResponse.json({
        bots: botsWithStats,
        summary: {
          totalBots: bots.length,
          activeBots: bots.filter(b => b.status === 'active').length,
          totalInvested,
          totalValue,
          overallPnl,
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      error: "Action not supported",
    }, { status: 400 });

  } catch (e: any) {
    console.error("DCA bot error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

// Create or manage DCA bots
export async function POST(req: Request) {
  try {
    // Check database connection
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const action = body.action;
    const userId = body.userId || "demo_user"; // TODO: Get from auth

    // CREATE BOT
    if (action === "create") {
      const {
        name,
        buyTokenMint,
        buyTokenSymbol,
        paymentTokenMint,
        paymentTokenSymbol,
        amountUsd,
        frequency,
        maxSlippage,
        walletAddress,
      } = body;

      // Validation
      if (!name || !buyTokenMint || !paymentTokenMint || !walletAddress) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      if (amountUsd < 1) {
        return NextResponse.json(
          { error: "Amount must be at least $1" },
          { status: 400 }
        );
      }

      // Create bot ID
      const botId = `dca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      const startDate = now;
      const nextExecution = calculateNextExecution(startDate, frequency as any);

      // Insert into database
      await db.insert(dcaBots).values({
        id: botId,
        userId,
        name,
        buyTokenMint,
        buyTokenSymbol,
        paymentTokenMint,
        paymentTokenSymbol,
        amountUsd,
        frequency,
        startDate,
        endDate: null,
        maxSlippage: maxSlippage || 0.5,
        status: "active",
        walletAddress,
        nextExecution,
        executionCount: 0,
        totalInvested: 0,
        totalReceived: 0,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        bot: {
          id: botId,
          name,
          status: "active",
          nextExecution,
        },
      }, { status: 200 });
    }

    // PAUSE BOT
    if (action === "pause") {
      const { botId } = body;
      
      await db
        .update(dcaBots)
        .set({ 
          status: "paused",
          nextExecution: null,
          updatedAt: Date.now(),
        })
        .where(and(
          eq(dcaBots.id, botId),
          eq(dcaBots.userId, userId)
        ));

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // RESUME BOT
    if (action === "resume") {
      const { botId } = body;
      
      const bot = await db
        .select()
        .from(dcaBots)
        .where(and(
          eq(dcaBots.id, botId),
          eq(dcaBots.userId, userId)
        ))
        .limit(1);

      if (bot.length === 0) {
        return NextResponse.json(
          { error: "Bot not found" },
          { status: 404 }
        );
      }

      const nextExecution = calculateNextExecution(Date.now(), bot[0].frequency as any);
      
      await db
        .update(dcaBots)
        .set({ 
          status: "active",
          nextExecution,
          updatedAt: Date.now(),
        })
        .where(eq(dcaBots.id, botId));

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // EXECUTE BOT (Manual execution)
    if (action === "execute") {
      const { botId } = body;
      
      const bot = await db
        .select()
        .from(dcaBots)
        .where(and(
          eq(dcaBots.id, botId),
          eq(dcaBots.userId, userId)
        ))
        .limit(1);

      if (bot.length === 0) {
        return NextResponse.json(
          { error: "Bot not found" },
          { status: 404 }
        );
      }

      // In Phase 1, we just return instructions for manual execution
      // In Phase 2, this would execute the actual swap
      return NextResponse.json({
        success: true,
        message: "Manual execution - please approve the transaction in your wallet",
        instructions: {
          buyToken: bot[0].buyTokenSymbol,
          paymentToken: bot[0].paymentTokenSymbol,
          amount: bot[0].amountUsd,
          jupiterUrl: `https://jup.ag/swap/${bot[0].paymentTokenMint}-${bot[0].buyTokenMint}`,
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      error: "Unknown action",
    }, { status: 400 });

  } catch (e: any) {
    console.error("DCA bot POST error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
