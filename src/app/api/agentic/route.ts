import { NextRequest, NextResponse } from "next/server";
import { ExecutionCoordinator, StrategyType } from "@/lib/agents";
import { PublicKey } from "@solana/web3.js";

// Global coordinator instance
let coordinator: ExecutionCoordinator | null = null;

function getCoordinator(): ExecutionCoordinator {
  if (!coordinator) {
    const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
    coordinator = new ExecutionCoordinator(rpcEndpoint);
  }
  return coordinator;
}

/**
 * POST /api/agentic
 * Execute a strategy with the agent system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy, input, userPublicKey } = body;

    // Validate input
    if (!strategy || !input) {
      return NextResponse.json(
        { error: "Missing strategy or input" },
        { status: 400 }
      );
    }

    // Parse public key
    let pubKey = null;
    if (userPublicKey) {
      try {
        pubKey = new PublicKey(userPublicKey);
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid public key" },
          { status: 400 }
        );
      }
    }

    // Execute strategy
    const coordinator = getCoordinator();
    const result = await coordinator.executeStrategy(
      strategy as StrategyType,
      input,
      pubKey
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Agent execution error:", error);
    return NextResponse.json(
      {
        error: error.message || "Agent execution failed",
        code: error.code || "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agentic?executionId=...
 * Get execution status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get("executionId");

    if (!executionId) {
      return NextResponse.json(
        { error: "Missing executionId parameter" },
        { status: 400 }
      );
    }

    const coordinator = getCoordinator();
    const status = coordinator.getStatus(executionId);

    if (!status) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error.message || "Status check failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agentic?executionId=...
 * Cancel an execution
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get("executionId");

    if (!executionId) {
      return NextResponse.json(
        { error: "Missing executionId parameter" },
        { status: 400 }
      );
    }

    const coordinator = getCoordinator();
    const cancelled = coordinator.cancelExecution(executionId);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Execution cancelled", executionId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: error.message || "Cancellation failed" },
      { status: 500 }
    );
  }
}
