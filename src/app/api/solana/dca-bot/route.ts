import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dcaBots, dcaExecutions, users } from "@/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { encryptKeypair } from "@/lib/keypair-envelope";

async function getUserId(walletAddress: string): Promise<string | null> {
  if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
    return null;
  }
  if (!db) throw new Error("Database not available");

  // SECURITY: Do NOT auto-create users - require existing user for DCA access
  const userResult = await db.select().from(users).where(eq(users.walletAddress, walletAddress)).limit(1);
  if (userResult.length === 0) {
    return null; // Return null instead of auto-creating
  }
  return userResult[0].id;
}
import { getTokenPrice, getBatchTokenPrices, calculateNextExecution } from "@/lib/jupiter-executor";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

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
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not connected" }, { status: 401 });
    }

    const userId = await getUserId(wallet);
    if (!userId) {
      return NextResponse.json(
        { error: "User not found. Please register or connect your wallet first." },
        { status: 403 }
      );
    }

    if (action === "list") {
      // Fetch all bots for user
      const bots = await db
        .select()
        .from(dcaBots)
        .where(eq(dcaBots.userId, userId))
        .orderBy(desc(dcaBots.createdAt));

      // ⚡ Bolt Optimization: Batch fetch token prices for unique mints
      // Reduces redundant Jupiter API calls for identical tokens across multiple bots
      // Replaced Promise.all O(N) quotes with O(1) batched Jupiter Price V2 API call
      const uniqueMints = Array.from(new Set(bots.map(bot => bot.buyTokenMint as string)));
      const prices = await getBatchTokenPrices(uniqueMints);
      const priceMap = new Map<string, number>(Object.entries(prices));

      // Calculate current stats for each bot
      const botsWithStats = bots.map((bot) => {
        // Get cached current price
        const currentPrice = priceMap.get(bot.buyTokenMint as string) || 0;

        // Calculate average price
        const totalInvest = Number(bot.totalInvested) || 0;
        const totalRecv = Number(bot.totalReceived) || 0;
        const avgPrice = totalRecv > 0
          ? totalInvest / totalRecv
          : 0;

        // Calculate P/L
        const currentValue = currentPrice ? totalRecv * currentPrice : 0;
        const pnlPercent = totalInvest > 0
          ? ((currentValue - totalInvest) / totalInvest) * 100
          : 0;

        return {
          id: bot.id,
          name: bot.name,
          status: bot.status,
          fromToken: bot.paymentTokenSymbol,
          toToken: bot.buyTokenSymbol,
          amount: Number(bot.amountUsd),
          frequency: bot.frequency,
          nextExecution: bot.nextExecution,
          totalInvested: totalInvest,
          totalReceived: totalRecv,
          avgPrice,
          currentPrice: currentPrice || 0,
          pnlPercent,
          executionCount: bot.executionCount,
          createdAt: bot.createdAt,
        };
      });

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
export async function POST(req: NextRequest) {
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

    // For actions that manage an existing bot (pause, resume, execute), we expect botId and wallet.
    // For create, we expect walletAddress inside the body.
    const wallet = body.walletAddress || body.wallet;
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not connected" }, { status: 401 });
    }

    const userId = await getUserId(wallet);
    if (!userId) {
      return NextResponse.json(
        { error: "User not found. Please register or connect your wallet first." },
        { status: 403 }
      );
    }

    // CREATE BOT
    if (action === "create") {
      // Rate limit: Enforce maximum allowed DCA bots based on tier
      const rateLimit = await checkRouteLimit(req, 'dca_bots');
      if (!rateLimit.allowed) {
        return NextResponse.json({
          error: 'Rate limit exceeded',
          tier: rateLimit.tier,
          resetAt: rateLimit.resetAt.toISOString(),
        }, { status: 429 });
      }

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
      const botId = `dca_${Date.now()}_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      const now = new Date();
      const startDate = now;
      const nextExecution = new Date(calculateNextExecution(Date.now(), frequency as any));

      // Generate per-bot keypair and encrypt it
      const botKeypair = Keypair.generate();
      const botSecretKeyBase58 = bs58.encode(botKeypair.secretKey);
      const encryptedKeypair = encryptKeypair(botSecretKeyBase58);
      const delegateAddress = botKeypair.publicKey.toBase58();

      // Insert into database
      await db.insert(dcaBots).values({
        id: botId,
        userId,
        name,
        buyTokenMint,
        buyTokenSymbol,
        paymentTokenMint,
        paymentTokenSymbol,
        amountUsd: String(amountUsd),
        frequency,
        startDate,
        endDate: null,
        maxSlippage: String(maxSlippage || 0.5),
        status: "active",
        walletAddress,
        nextExecution,
        executionCount: 0,
        totalInvested: '0',
        totalReceived: '0',
        encryptedKeypair,
      });

      return NextResponse.json({
        success: true,
        bot: {
          id: botId,
          name,
          status: "active",
          nextExecution,
          delegateAddress,
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
          updatedAt: new Date(),
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

      const nextExecution = new Date(calculateNextExecution(Date.now(), bot[0].frequency as any));

      await db
        .update(dcaBots)
        .set({
          status: "active",
          nextExecution,
          updatedAt: new Date(),
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
