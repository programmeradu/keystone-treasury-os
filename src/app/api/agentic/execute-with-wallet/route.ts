/**
 * Enhanced Agent Execution API with Wallet Integration
 * POST /api/agentic/execute-with-wallet
 */

import { NextRequest, NextResponse } from "next/server";
import { ExecutionCoordinator, StrategyType } from "@/lib/agents";
import { PublicKey } from "@solana/web3.js";
import { type ApprovalRequest } from "@/lib/wallet/transaction-executor";

// Global coordinator and pending approvals
let coordinator: ExecutionCoordinator | null = null;
const pendingApprovals = new Map<string, any>();

function getCoordinator(): ExecutionCoordinator {
  if (!coordinator) {
    const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
    coordinator = new ExecutionCoordinator(rpcEndpoint);
  }
  return coordinator;
}

/**
 * POST /api/agentic/execute-with-wallet
 * Execute strategy with wallet approval flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy, input, userPublicKey, requiresApproval = true } = body;

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
      {
        ...input,
        requiresApproval,
        walletIntegrated: true
      },
      pubKey
    );

    // If approval required, store in pending
    // Extract wallet result which may include approval requirements
    const walletResult = result.result || {};
    
    if (walletResult.requiresApproval && walletResult.approvalId) {
      pendingApprovals.set(walletResult.approvalId, {
        id: walletResult.approvalId,
        userPublicKey,
        strategy,
        status: "pending",
        estimatedFee: walletResult.estimatedFee,
        description: walletResult.description,
        riskLevel: walletResult.riskLevel,
        transaction: walletResult.tx,
        result: walletResult,
        metadata: {
          strategy,
          input,
          userPublicKey,
          createdAt: Date.now()
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minute TTL
      });

      return NextResponse.json({
        status: "approval_required",
        requiresApproval: true,
        approvalId: walletResult.approvalId,
        estimatedFee: walletResult.estimatedFee,
        description: walletResult.description,
        riskLevel: walletResult.riskLevel,
        executionId: result.executionId
      });
    }

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
 * GET /api/agentic/pending-approvals?userPublicKey=...
 * Get pending wallet approvals for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userPublicKey = searchParams.get("userPublicKey");
    const approvalId = searchParams.get("approvalId");

    if (approvalId) {
      // Get specific approval
      const approval = pendingApprovals.get(approvalId);
      if (!approval) {
        return NextResponse.json(
          { error: "Approval not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(approval, { status: 200 });
    }

    if (!userPublicKey) {
      return NextResponse.json(
        { error: "Missing userPublicKey parameter" },
        { status: 400 }
      );
    }

    // Get all pending approvals for user
    const userApprovals = Array.from(pendingApprovals.values())
      .filter(
        (a) =>
          a.userPublicKey === userPublicKey &&
          a.expiresAt && a.expiresAt > Date.now()
      );

    return NextResponse.json(
      {
        approvals: userApprovals,
        count: userApprovals.length
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Approval fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Approval fetch failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agentic/execute-with-wallet?approvalId=...
 * Reject an approval request
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approvalId = searchParams.get("approvalId");

    if (!approvalId) {
      return NextResponse.json(
        { error: "Missing approvalId parameter" },
        { status: 400 }
      );
    }

    const deleted = pendingApprovals.delete(approvalId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Approval rejected", approvalId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Rejection error:", error);
    return NextResponse.json(
      { error: error.message || "Rejection failed" },
      { status: 500 }
    );
  }
}
