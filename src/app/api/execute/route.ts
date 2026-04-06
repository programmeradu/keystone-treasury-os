import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { ExecutionCoordinator } from "@/lib/agents/coordinator";
import { PublicKey } from "@solana/web3.js";
import { db } from "@/db";
import { agentExecutions } from "@/db/schema";

const COMMON_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZxHZCGCRaeLJZoFpK6XNbRIo5jZbGT5",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
};

/**
 * POST /api/execute — Execute a treasury operation via the agent coordinator.
 *
 * Accepts natural-language prompts OR structured strategy inputs.
 * Returns an ExecutionResult with simulation data, requiring user approval
 * for any state-changing operation.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth required
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { prompt, strategy: explicitStrategy, input: explicitInput, wallet } = body;

    // Resolve strategy + input from prompt or explicit params
    const { strategy, input } = explicitStrategy
      ? { strategy: explicitStrategy, input: explicitInput || {} }
      : inferStrategy(prompt || "", wallet || user.walletAddress);

    if (!strategy) {
      return NextResponse.json(
        { error: { code: "UNKNOWN_STRATEGY", message: "Could not infer a strategy from your prompt. Try: swap, rebalance, stake, or analyze." } },
        { status: 400 }
      );
    }

    // Build coordinator with Helius RPC
    const heliusKey = process.env.HELIUS_API_KEY;
    const rpcEndpoint = heliusKey
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
      : "https://api.mainnet-beta.solana.com";

    const coordinator = new ExecutionCoordinator(rpcEndpoint);

    // Set wallet in input
    input.wallet = wallet || user.walletAddress;

    // Execute strategy (simulation-only: returns APPROVAL_REQUIRED, not final execution)
    const userPublicKey = new PublicKey(user.walletAddress);
    const result = await coordinator.executeStrategy(strategy, input, userPublicKey);

    // Persist execution to DB for state recovery (serverless-safe)
    if (db) {
      try {
        await db.insert(agentExecutions).values({
          id: result.executionId,
          userId: user.id,
          walletAddress: user.walletAddress,
          strategy: result.strategy,
          status: result.status,
          input: input,
          result: result.result || {},
          error: result.errors?.[0]?.message || null,
          duration: result.duration,
          approvalRequired: result.status === "APPROVAL_REQUIRED",
        });
      } catch (dbErr) {
        console.error("[execute] Failed to persist execution:", dbErr);
      }
    }

    return NextResponse.json({
      ok: result.success,
      executionId: result.executionId,
      strategy: result.strategy,
      status: result.status,
      result: result.result,
      errors: result.errors.length > 0 ? result.errors : undefined,
      duration: result.duration,
      // Legacy compat: map to old run shape for existing UI
      run: mapToLegacyRun(result),
    });
  } catch (err: any) {
    console.error("[execute] Error:", err);
    return NextResponse.json(
      { ok: false, error: { code: "EXECUTION_ERROR", message: err?.message || "Execution failed" } },
      { status: 500 }
    );
  }
}

/**
 * Infer strategy type and input params from a natural-language prompt.
 */
function inferStrategy(prompt: string, walletAddress: string): { strategy: string | null; input: any } {
  const t = prompt.toLowerCase().trim();
  if (!t) return { strategy: null, input: {} };

  // Swap: "swap 100 USDC to SOL"
  const swapMatch = t.match(/swap\s+([\d,.]+)\s*(\w+)\s+(?:to|for|into)\s+(\w+)/i);
  if (swapMatch || t.includes("swap")) {
    const amount = swapMatch ? parseFloat(swapMatch[1].replace(/,/g, "")) : 0;
    const inSymbol = swapMatch ? swapMatch[2].toUpperCase() : "USDC";
    const outSymbol = swapMatch ? swapMatch[3].toUpperCase() : "SOL";
    return {
      strategy: "swap_token",
      input: {
        inputMint: COMMON_MINTS[inSymbol] || inSymbol,
        outputMint: COMMON_MINTS[outSymbol] || outSymbol,
        amount: amount || 1000000, // default 1 USDC in smallest units
        slippage: 0.5,
        wallet: walletAddress,
      },
    };
  }

  // Rebalance: "rebalance portfolio" or "rebalance to 50% SOL 30% USDC 20% JUP"
  if (t.includes("rebalance")) {
    const allocMatches = [...t.matchAll(/([\d.]+)%?\s+(\w+)/g)];
    const targetAllocations = allocMatches.length > 0
      ? allocMatches.map((m) => ({ token: m[2].toUpperCase(), percentage: parseFloat(m[1]) }))
      : [];
    return {
      strategy: "rebalance_portfolio",
      input: {
        wallet: walletAddress,
        targetAllocations,
      },
    };
  }

  // Stake: "stake 10 SOL" or "stake 5 SOL with jito"
  const stakeMatch = t.match(/stake\s+([\d,.]+)\s*(?:sol)?(?:\s+(?:with|via|on)\s+(\w+))?/i);
  if (stakeMatch || t.includes("stake")) {
    const amountSol = stakeMatch ? parseFloat(stakeMatch[1].replace(/,/g, "")) : 1;
    const provider = stakeMatch?.[2] || "marinade";
    return {
      strategy: "stake_sol",
      input: {
        amount: Math.floor(amountSol * 1e9), // Convert to lamports
        provider,
        wallet: walletAddress,
      },
    };
  }

  // Token safety: "analyze SOL" or "is BONK safe"
  if (t.includes("analyze") || t.includes("safety") || t.includes("is") && t.includes("safe")) {
    const tokenMatch = t.match(/(?:analyze|check|is)\s+(\w+)/i);
    const symbol = tokenMatch ? tokenMatch[1].toUpperCase() : "";
    const mint = COMMON_MINTS[symbol] || symbol;
    if (mint) {
      return {
        strategy: "analyze_token_safety",
        input: { mint },
      };
    }
  }

  // DCA: "dca 100 USDC into SOL daily"
  const dcaMatch = t.match(/dca\s+([\d,.]+)\s*(\w+)\s+(?:into|to|for)\s+(\w+)\s+(\w+)/i);
  if (dcaMatch || t.includes("dca")) {
    return {
      strategy: "execute_dca",
      input: {
        inMint: COMMON_MINTS[(dcaMatch?.[2] || "USDC").toUpperCase()] || dcaMatch?.[2],
        outMint: COMMON_MINTS[(dcaMatch?.[3] || "SOL").toUpperCase()] || dcaMatch?.[3],
        amount: dcaMatch ? parseFloat(dcaMatch[1].replace(/,/g, "")) : 100,
        frequency: dcaMatch?.[4] || "daily",
      },
    };
  }

  return { strategy: null, input: {} };
}

/**
 * Map ExecutionResult to the legacy run shape for backwards compatibility
 * with the existing app-client.tsx UI.
 */
function mapToLegacyRun(result: any) {
  const steps = [];

  // Map execution status to step list
  if (result.status === "APPROVAL_REQUIRED") {
    steps.push({
      index: 0,
      title: "Strategy planned",
      status: "confirmed",
    });
    steps.push({
      index: 1,
      title: "Simulation passed",
      status: result.result?.simulation?.passed ? "success" : "pending",
    });
    steps.push({
      index: 2,
      title: "Awaiting approval",
      status: "pending",
    });
  } else if (result.status === "SUCCESS") {
    steps.push({ index: 0, title: "Execution complete", status: "success" });
  } else if (result.status === "FAILED") {
    steps.push({
      index: 0,
      title: result.errors?.[0]?.message || "Execution failed",
      status: "failed",
    });
  }

  return {
    id: result.executionId,
    status: result.status === "APPROVAL_REQUIRED" ? "approval_required" : result.status.toLowerCase(),
    createdAt: result.timestamp,
    summary: buildSummary(result),
    steps,
  };
}

function buildSummary(result: any): string {
  if (result.status === "FAILED") {
    return result.errors?.[0]?.message || "Execution failed";
  }
  const data = result.result || {};
  if (data.swap_result) {
    const sr = data.swap_result;
    return `Swap ready: ${sr.priceImpact || "?"}% price impact, risk=${sr.riskLevel || "unknown"}. ${sr.requiresApproval ? "Approve to execute." : ""}`;
  }
  if (data.trades) {
    return `Rebalance: ${data.trades.length} trades planned across $${Math.round(data.totalValue || 0).toLocaleString()} portfolio. Approve to execute.`;
  }
  if (data.provider) {
    return `Stake ${data.amountSol || "?"} SOL via ${data.provider}. Approve to sign.`;
  }
  return `Strategy ${result.strategy} completed (${result.status}).`;
}
