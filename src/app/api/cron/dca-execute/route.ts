import { NextResponse } from "next/server";
import { db } from "@/db";
import { dcaBots, dcaExecutions } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import { executeSwapWithSigning, getJupiterQuote, validateDelegation } from "@/lib/jupiter-executor";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max execution time

/**
 * Cron Endpoint for Automated DCA Bot Execution
 * 
 * Runs every 5 minutes via Vercel Cron
 * Checks for bots that are due to execute and processes them
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized cron request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check database connection
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const now = Date.now();
    console.log(`[DCA Cron] Starting execution check at ${new Date(now).toISOString()}`);

    // Find all bots that are due to execute
    const dueBots = await db
      .select()
      .from(dcaBots)
      .where(
        and(
          eq(dcaBots.status, "active"),
          lte(dcaBots.nextExecution, now)
        )
      );

    console.log(`[DCA Cron] Found ${dueBots.length} bots due for execution`);

    if (dueBots.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No bots due for execution",
        executedCount: 0,
        timestamp: now,
      });
    }

    // Process each bot
    const results = await Promise.allSettled(
      dueBots.map(bot => executeBot(bot))
    );

    // Count successes and failures
    const successCount = results.filter(r => r.status === "fulfilled" && r.value.success).length;
    const failureCount = results.length - successCount;

    console.log(`[DCA Cron] Execution complete: ${successCount} success, ${failureCount} failures`);

    return NextResponse.json({
      success: true,
      message: `Processed ${dueBots.length} bots`,
      executedCount: successCount,
      failedCount: failureCount,
      timestamp: now,
    });

  } catch (error: any) {
    console.error("[DCA Cron] Fatal error:", error);
    return NextResponse.json(
      { 
        error: "Cron execution failed",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Execute a single bot's trade
 */
async function executeBot(bot: any): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  console.log(`[Bot ${bot.id}] Starting execution for ${bot.name}`);

  try {
    // Check database connection
    if (!db) {
      throw new Error("Database not available");
    }

    // Phase 2 TODO: Validate wallet balance
    // const balance = await checkBalance(bot.walletAddress, bot.paymentTokenMint);
    // if (balance < bot.amountUsd) {
    //   await pauseBot(bot.id, "Insufficient balance");
    //   return { success: false, error: "Insufficient balance" };
    // }

    // Get Jupiter quote
    const USDC_DECIMALS = 6;
    const amountInSmallestUnit = Math.floor(bot.amountUsd * Math.pow(10, USDC_DECIMALS));
    const slippageBps = Math.floor((bot.maxSlippage || 0.5) * 100);

    // Validate delegation before proceeding
    console.log(`[Bot ${bot.id}] Validating delegation...`);
    const delegation = await validateDelegation(bot.walletAddress, bot.paymentTokenMint, amountInSmallestUnit);
    if (!delegation.isValid) {
      console.error(`[Bot ${bot.id}] Delegation validation failed: ${delegation.error}`);
      await recordFailedExecution(bot, `Insufficient Delegation: ${delegation.error}`);
      return { success: false, error: "Insufficient Delegation" };
    }

    console.log(`[Bot ${bot.id}] Getting Jupiter quote...`);
    const quote = await getJupiterQuote(
      bot.paymentTokenMint,
      bot.buyTokenMint,
      amountInSmallestUnit,
      slippageBps
    );

    if (!quote) {
      console.error(`[Bot ${bot.id}] Failed to get quote`);
      await recordFailedExecution(bot, "Failed to get Jupiter quote");
      return { success: false, error: "Failed to get quote" };
    }

    // Validate slippage is acceptable
    const quotedSlippagePct = quote.slippageBps / 100;
    if (quotedSlippagePct > bot.maxSlippage) {
      console.warn(`[Bot ${bot.id}] Slippage too high: ${quotedSlippagePct}% > ${bot.maxSlippage}%`);
      await skipExecution(bot, "Slippage too high");
      return { success: false, error: "Slippage too high" };
    }

    // Execute the actual swap
    console.log(`[Bot ${bot.id}] Executing swap...`);
    
    const delegatePrivateKeyBase58 = process.env.DELEGATE_WALLET_PRIVATE_KEY;
    if (!delegatePrivateKeyBase58) {
      console.error(`[Bot ${bot.id}] Delegate wallet private key not configured`);
      await recordFailedExecution(bot, "Server configuration error");
      return { success: false, error: "Configuration error" };
    }

    const signerKeypair = Keypair.fromSecretKey(bs58.decode(delegatePrivateKeyBase58));

    const executionResult = await executeSwapWithSigning({
      inputMint: bot.paymentTokenMint,
      outputMint: bot.buyTokenMint,
      amountInSmallestUnit,
      slippageBps,
      userWallet: bot.walletAddress,
      signerKeypair,
    });

    if (!executionResult.success) {
      console.error(`[Bot ${bot.id}] Swap execution failed: ${executionResult.error}`);
      await recordFailedExecution(bot, `Execution Failed: ${executionResult.error}`);
      return { success: false, error: executionResult.error };
    }

    // Record successful execution
    await db.insert(dcaExecutions).values({
      botId: bot.id,
      executedAt: Date.now(),
      paymentAmount: bot.amountUsd,
      receivedAmount: executionResult.outAmount / Math.pow(10, 9), // Assuming 9 decimals for SOL
      price: executionResult.price,
      slippage: executionResult.slippage,
      txSignature: executionResult.txSignature,
      gasUsed: 0.000005, // Estimated 5000 lamports
      status: "success",
      jupiterQuoteId: quote.routePlan?.[0]?.swapInfo?.ammKey || null,
      createdAt: Date.now(),
    });

    // Update bot statistics
    const newTotalInvested = bot.totalInvested + bot.amountUsd;
    const newTotalReceived = bot.totalReceived + (executionResult.outAmount / Math.pow(10, 9));
    const newExecutionCount = bot.executionCount + 1;
    const newNextExecution = calculateNextExecution(bot);

    await db
      .update(dcaBots)
      .set({
        executionCount: newExecutionCount,
        totalInvested: newTotalInvested,
        totalReceived: newTotalReceived,
        nextExecution: newNextExecution,
        lastExecutionAttempt: Date.now(),
        failedAttempts: 0, // Reset failed attempts on success
        updatedAt: Date.now(),
      })
      .where(eq(dcaBots.id, bot.id));

    const duration = Date.now() - startTime;
    console.log(`[Bot ${bot.id}] Execution successful in ${duration}ms`);

    // Phase 2 TODO: Send notification email
    // await sendExecutionNotification(bot, executionResult);

    return { success: true };

  } catch (error: any) {
    console.error(`[Bot ${bot.id}] Execution failed:`, error);
    await recordFailedExecution(bot, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Record a failed execution attempt
 */
async function recordFailedExecution(bot: any, errorMessage: string) {
  if (!db) return;

  try {
    // Record failed execution
    await db.insert(dcaExecutions).values({
      botId: bot.id,
      executedAt: Date.now(),
      paymentAmount: bot.amountUsd,
      receivedAmount: 0,
      price: 0,
      slippage: 0,
      txSignature: null,
      gasUsed: 0,
      status: "failed",
      errorMessage,
      createdAt: Date.now(),
    });

    // Update bot with failure info
    const newFailedAttempts = (bot.failedAttempts || 0) + 1;
    const shouldPause = newFailedAttempts >= 3;

    await db
      .update(dcaBots)
      .set({
        lastExecutionAttempt: Date.now(),
        failedAttempts: newFailedAttempts,
        status: shouldPause ? "paused" : bot.status,
        pauseReason: shouldPause ? `Failed ${newFailedAttempts} times: ${errorMessage}` : bot.pauseReason,
        updatedAt: Date.now(),
      })
      .where(eq(dcaBots.id, bot.id));

    if (shouldPause) {
      console.warn(`[Bot ${bot.id}] Paused after ${newFailedAttempts} failures`);
      // Phase 2 TODO: Send notification email
    }
  } catch (error) {
    console.error(`[Bot ${bot.id}] Failed to record execution failure:`, error);
  }
}

/**
 * Skip execution due to unfavorable conditions (high slippage, etc.)
 */
async function skipExecution(bot: any, reason: string) {
  if (!db) return;

  try {
    console.log(`[Bot ${bot.id}] Skipping execution: ${reason}`);
    
    // Just update next execution time without recording failure
    const newNextExecution = calculateNextExecution(bot);
    
    await db
      .update(dcaBots)
      .set({
        nextExecution: newNextExecution,
        lastExecutionAttempt: Date.now(),
        updatedAt: Date.now(),
      })
      .where(eq(dcaBots.id, bot.id));
  } catch (error) {
    console.error(`[Bot ${bot.id}] Failed to skip execution:`, error);
  }
}

/**
 * Calculate next execution time based on bot's frequency
 */
function calculateNextExecution(bot: any): number {
  const now = Date.now();
  const frequency = bot.frequency;
  
  switch (frequency) {
    case "daily":
      return now + (24 * 60 * 60 * 1000); // +1 day
    case "weekly":
      return now + (7 * 24 * 60 * 60 * 1000); // +7 days
    case "biweekly":
      return now + (14 * 24 * 60 * 60 * 1000); // +14 days
    case "monthly":
      return now + (30 * 24 * 60 * 60 * 1000); // +30 days
    default:
      return now + (24 * 60 * 60 * 1000); // Default to daily
  }
}
