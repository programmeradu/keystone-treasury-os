/**
 * Netlify Scheduled Function for DCA Bot Execution
 * Runs every 5 minutes to check and execute due bots
 * 
 * Note: Netlify scheduled functions have 30 second timeout
 */

import type { Config } from "@netlify/functions";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../../../src/db/schema';
import { eq, and, lte } from "drizzle-orm";
import { getJupiterQuote } from '../../../src/lib/jupiter-executor';

const { dcaBots, dcaExecutions } = schema;

export default async (req: Request) => {
  const startTime = Date.now();
  console.log('[DCA Scheduled Function] Starting execution check...');

  try {
    // Parse request body to get next_run timestamp
    const { next_run } = await req.json();
    console.log(`[DCA Scheduled Function] Next scheduled run: ${next_run}`);

    // Connect to database
    const url = process.env.TURSO_CONNECTION_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      console.error('[DCA Scheduled Function] Missing database credentials');
      return new Response(JSON.stringify({ 
        error: 'Database credentials not configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = createClient({ url, authToken });
    const db = drizzle(client, { schema });

    const now = Date.now();

    // Find all bots that are due to execute
    const dueBots = await db
      .select()
      .from(dcaBots)
      .where(
        and(
          eq(dcaBots.status, "active"),
          lte(dcaBots.nextExecution, now)
        )
      )
      .limit(10); // Process max 10 bots per run to stay under 30s limit

    console.log(`[DCA Scheduled Function] Found ${dueBots.length} bots due for execution`);

    if (dueBots.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No bots due for execution",
        executedCount: 0,
        timestamp: now,
        duration: Date.now() - startTime
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process bots (max 10 to stay under timeout)
    const results = await Promise.allSettled(
      dueBots.map(bot => executeBot(bot, db))
    );

    const successCount = results.filter(r => r.status === "fulfilled" && r.value?.success).length;
    const failureCount = results.length - successCount;

    const duration = Date.now() - startTime;
    console.log(`[DCA Scheduled Function] Complete in ${duration}ms: ${successCount} success, ${failureCount} failures`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${dueBots.length} bots`,
      executedCount: successCount,
      failedCount: failureCount,
      timestamp: now,
      duration,
      nextRun: next_run
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[DCA Scheduled Function] Fatal error:', error);
    return new Response(JSON.stringify({
      error: 'Execution failed',
      details: error.message,
      duration: Date.now() - startTime
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Execute a single bot's trade
 */
async function executeBot(bot: any, db: any): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now();
  console.log(`[Bot ${bot.id}] Starting execution for ${bot.name}`);

  try {
    // Get Jupiter quote
    const USDC_DECIMALS = 6;
    const amountInSmallestUnit = Math.floor(bot.amountUsd * Math.pow(10, USDC_DECIMALS));
    const slippageBps = Math.floor((bot.maxSlippage || 0.5) * 100);

    console.log(`[Bot ${bot.id}] Getting Jupiter quote...`);
    const quote = await getJupiterQuote(
      bot.paymentTokenMint,
      bot.buyTokenMint,
      amountInSmallestUnit,
      slippageBps
    );

    if (!quote) {
      console.error(`[Bot ${bot.id}] Failed to get quote`);
      await recordFailedExecution(bot, db, "Failed to get Jupiter quote");
      return { success: false, error: "Failed to get quote" };
    }

    // Validate slippage
    const quotedSlippagePct = quote.slippageBps / 100;
    if (quotedSlippagePct > bot.maxSlippage) {
      console.warn(`[Bot ${bot.id}] Slippage too high: ${quotedSlippagePct}% > ${bot.maxSlippage}%`);
      await skipExecution(bot, db, "Slippage too high");
      return { success: false, error: "Slippage too high" };
    }

    // Phase 2A: Simulate execution (no real transaction yet)
    console.log(`[Bot ${bot.id}] Simulating execution...`);
    
    const executionResult = {
      success: true,
      txSignature: `sim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      inAmount: parseFloat(quote.inAmount),
      outAmount: parseFloat(quote.outAmount),
      price: parseFloat(quote.inAmount) > 0 
        ? parseFloat(quote.outAmount) / parseFloat(quote.inAmount) 
        : 0,
      slippage: quotedSlippagePct,
    };

    // Record successful execution
    await db.insert(dcaExecutions).values({
      botId: bot.id,
      executedAt: Date.now(),
      paymentAmount: bot.amountUsd,
      receivedAmount: executionResult.outAmount / Math.pow(10, 9),
      price: executionResult.price,
      slippage: executionResult.slippage,
      txSignature: executionResult.txSignature,
      gasUsed: 0.000005,
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
        failedAttempts: 0,
        updatedAt: Date.now(),
      })
      .where(eq(dcaBots.id, bot.id));

    const duration = Date.now() - startTime;
    console.log(`[Bot ${bot.id}] Success in ${duration}ms`);

    return { success: true };

  } catch (error: any) {
    console.error(`[Bot ${bot.id}] Execution failed:`, error);
    await recordFailedExecution(bot, db, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Record a failed execution
 */
async function recordFailedExecution(bot: any, db: any, errorMessage: string) {
  try {
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
      console.warn(`[Bot ${bot.id}] Auto-paused after ${newFailedAttempts} failures`);
    }
  } catch (error) {
    console.error(`[Bot ${bot.id}] Failed to record execution failure:`, error);
  }
}

/**
 * Skip execution due to unfavorable conditions
 */
async function skipExecution(bot: any, db: any, reason: string) {
  try {
    console.log(`[Bot ${bot.id}] Skipping execution: ${reason}`);
    
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
 * Calculate next execution time
 */
function calculateNextExecution(bot: any): number {
  const now = Date.now();
  const frequency = bot.frequency;
  
  switch (frequency) {
    case "daily":
      return now + (24 * 60 * 60 * 1000);
    case "weekly":
      return now + (7 * 24 * 60 * 60 * 1000);
    case "biweekly":
      return now + (14 * 24 * 60 * 60 * 1000);
    case "monthly":
      return now + (30 * 24 * 60 * 60 * 1000);
    default:
      return now + (24 * 60 * 60 * 1000);
  }
}

// Configure the schedule - runs every 5 minutes
export const config: Config = {
  schedule: "*/5 * * * *"
};
