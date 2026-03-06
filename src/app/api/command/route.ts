import { NextRequest, NextResponse } from "next/server";
import { planStrategy } from "@/lib/llm/strategy-planner";
import { ExecutionCoordinator } from "@/lib/agents/coordinator";
import { KnowledgeBase } from "@/lib/knowledge";

// ─── Well-Known Solana Token Mints ──────────────────────────────────
const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  // Liquid staking tokens — multiple aliases
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  JITO: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  BSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  STSOL: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  BTC: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  TRUMP: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
};

function resolveTokenMint(symbol: string): string | null {
  // Normalize: strip whitespace, uppercase, remove hyphens/underscores
  const normalized = symbol.trim().toUpperCase().replace(/[-_\s]/g, "");
  return TOKEN_MINTS[normalized] || null;
}

// ─── Operations that the ExecutionCoordinator handles (real agents) ─
const COORDINATOR_OPS: Record<string, string> = {
  swap: "swap_token",
  rebalance: "rebalance_portfolio",
  stake: "stake_sol",
  analyze_token_safety: "analyze_token_safety",
  detect_mev: "detect_mev",
  execute_dca: "execute_dca",
  optimize_fees: "optimize_fees",
};

// ─── Operations handled client-side (no coordinator needed) ─────────
const CLIENT_OPS = new Set([
  "navigate", "refresh", "ui_query", "governance_list",
  "governance_approve", "governance_execute", "external_balance",
  "monitor", "plugin_register", "transfer", "bridge",
  "yield_deposit", "yield_withdraw",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, walletState, walletAddress } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Default wallet state
    const state = walletState || { balances: {}, portfolio: {}, totalValue: 0 };

    // ─── Phase 1: LLM Planning (Groq) ──────────────────────────────
    const plan = await planStrategy(prompt, state);

    // Handle direct answers (no actions)
    if (plan.direct_answer && (!plan.actions || plan.actions.length === 0)) {
      return NextResponse.json({
        plan,
        mode: "answer",
        execution: null,
      });
    }

    if (!plan.actions || plan.actions.length === 0) {
      return NextResponse.json({
        plan,
        mode: "empty",
        execution: null,
      });
    }

    // ─── Phase 2: Route to ExecutionCoordinator or Client ──────────
    const firstAction = plan.actions[0];
    const operation = firstAction.operation.toLowerCase();
    const coordinatorStrategy = COORDINATOR_OPS[operation];

    // If this is a coordinator-supported operation, execute with real agents
    if (coordinatorStrategy) {
      const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
        || (process.env.HELIUS_API_KEY
          ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
          : "https://api.mainnet-beta.solana.com");

      const coordinator = new ExecutionCoordinator(rpcEndpoint);

      // Build coordinator input from LLM plan parameters
      let coordinatorInput: any = { ...firstAction.parameters };

      // Resolve token symbols → mint addresses for swap operations
      if (operation === "swap") {
        const inMint = resolveTokenMint(firstAction.parameters.inputToken);
        const outMint = resolveTokenMint(firstAction.parameters.outputToken);

        if (!inMint) {
          return NextResponse.json({
            error: `Unknown input token: ${firstAction.parameters.inputToken}`,
            plan,
            mode: "error",
          }, { status: 400 });
        }
        if (!outMint) {
          return NextResponse.json({
            error: `Unknown output token: ${firstAction.parameters.outputToken}`,
            plan,
            mode: "error",
          }, { status: 400 });
        }

        const decimals = firstAction.parameters.inputToken === "USDC" || firstAction.parameters.inputToken === "USDT" ? 6 : 9;
        coordinatorInput = {
          inputMint: inMint,
          outputMint: outMint,
          inMint: inMint,
          outMint: outMint,
          amount: Math.floor(firstAction.parameters.amount * Math.pow(10, decimals)),
          slippage: firstAction.parameters.slippage || 0.5,
        };
      }

      // Resolve for rebalance
      if (operation === "rebalance" && firstAction.parameters.targetAllocations) {
        coordinatorInput = {
          wallet: walletAddress || "",
          targets: firstAction.parameters.targetAllocations,
        };
      }

      // Execute via real agents
      const executionResult = await coordinator.executeStrategy(
        coordinatorStrategy as any,
        coordinatorInput,
        walletAddress || null,
      );

      // ─── Phase 3: Knowledge Fallback for Unknown Protocols ───────
      if (!executionResult.success && operation === "swap") {
        console.log("[Command] Coordinator failed, attempting Knowledge fallback...");
        try {
          const kb = new KnowledgeBase();
          const research = await kb.study(
            `${firstAction.parameters.inputToken} ${firstAction.parameters.outputToken} Solana swap`
          );
          if (research.rawContent) {
            plan.warnings = [
              ...(plan.warnings || []),
              `Agent execution failed. Knowledge Base found ${research.sources.length} sources for reference.`,
            ];
            plan.logs = [
              ...(plan.logs || []),
              `KB Research: ${research.summary}`,
            ];
          }
        } catch (kbErr) {
          console.warn("[Command] Knowledge fallback also failed:", kbErr);
        }
      }

      return NextResponse.json({
        plan,
        mode: "coordinator",
        execution: {
          executionId: executionResult.executionId,
          status: executionResult.status,
          success: executionResult.success,
          result: executionResult.result,
          errors: executionResult.errors,
          duration: executionResult.duration,
        },
      });
    }

    // ─── Client-side operations: return plan for CommandBar to handle
    if (CLIENT_OPS.has(operation)) {
      return NextResponse.json({
        plan,
        mode: "client",
        execution: null,
      });
    }

    // Unknown operation — return plan anyway
    return NextResponse.json({
      plan,
      mode: "client",
      execution: null,
    });

  } catch (error) {
    console.error("[Command API] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process command",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
