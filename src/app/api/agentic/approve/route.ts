import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";

interface ApprovalRequest {
  executionId: string;
  message: string;
  instructions?: any[];
  estimatedFee?: number;
  riskLevel?: "low" | "medium" | "high";
}

interface ApprovalResponse {
  approved: boolean;
  signature?: string;
  timestamp: number;
}

// Store pending approvals in memory (in production, use a database)
const pendingApprovals = new Map<
  string,
  {
    request: ApprovalRequest;
    timestamp: number;
    resolved: boolean;
    response?: ApprovalResponse;
  }
>();

/**
 * POST /api/agentic/approve
 * Submit a transaction for approval
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ApprovalRequest;
    const { executionId, message, instructions, estimatedFee, riskLevel } =
      body;

    if (!executionId || !message) {
      return NextResponse.json(
        { error: "Missing executionId or message" },
        { status: 400 }
      );
    }

    // Create approval request
    const approvalId = `approval_${executionId}_${Date.now()}`;
    const approvalRequest = {
      request: {
        executionId,
        message,
        instructions,
        estimatedFee,
        riskLevel: riskLevel || "medium"
      },
      timestamp: Date.now(),
      resolved: false,
      response: undefined
    };

    pendingApprovals.set(approvalId, approvalRequest);

    // In a real implementation, this would:
    // 1. Create a WebSocket connection to notify the frontend
    // 2. Store the request in a database with a TTL
    // 3. Return a polling URL or WebSocket connection info

    return NextResponse.json(
      {
        approvalId,
        status: "pending",
        message: "Approval request created. Awaiting user signature.",
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minute TTL
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Approval request error:", error);
    return NextResponse.json(
      { error: error.message || "Approval request failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agentic/approve?approvalId=...
 * Get approval status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const approvalId = searchParams.get("approvalId");

    if (!approvalId) {
      return NextResponse.json(
        { error: "Missing approvalId parameter" },
        { status: 400 }
      );
    }

    const approval = pendingApprovals.get(approvalId);

    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }

    // Check if approval has expired (5 minutes)
    const ageMs = Date.now() - approval.timestamp;
    if (ageMs > 5 * 60 * 1000) {
      pendingApprovals.delete(approvalId);
      return NextResponse.json(
        { error: "Approval expired" },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        approvalId,
        status: approval.resolved ? "resolved" : "pending",
        request: approval.request,
        response: approval.response || null,
        expiresAt: approval.timestamp + 5 * 60 * 1000
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Approval status error:", error);
    return NextResponse.json(
      { error: error.message || "Status check failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agentic/approve
 * Respond to an approval request with signature
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { approvalId, approved, signature } = body;

    if (!approvalId) {
      return NextResponse.json(
        { error: "Missing approvalId" },
        { status: 400 }
      );
    }

    const approval = pendingApprovals.get(approvalId);

    if (!approval) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    if (approval.resolved) {
      return NextResponse.json(
        { error: "Approval already resolved" },
        { status: 409 }
      );
    }

    // Mark as resolved
    approval.resolved = true;
    approval.response = {
      approved: approved === true,
      signature: approved ? signature : undefined,
      timestamp: Date.now()
    };

    return NextResponse.json(
      {
        approvalId,
        status: "resolved",
        approved: approved === true
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Approval response error:", error);
    return NextResponse.json(
      { error: error.message || "Approval response failed" },
      { status: 500 }
    );
  }
}
