import { NextRequest, NextResponse } from "next/server";

// Mock data for demonstration - in production, this would fetch from multiple Solana governance APIs
// such as Realms, Squads, Mango DAO, etc.

interface Proposal {
  id: string;
  title: string;
  protocol: string;
  status: "active" | "passed" | "rejected" | "pending";
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  endsAt: string;
  description?: string;
  quorumReached: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "active";

    // In production, fetch from actual governance APIs:
    // - Realms API (governance.solana.com)
    // - Mango DAO
    // - Marinade DAO
    // - Jito DAO
    // - Squads
    
    // Mock proposals for demonstration
    const allProposals: Proposal[] = [
      {
        id: "prop-1",
        title: "Increase Validator Commission Cap to 12%",
        protocol: "Marinade Finance",
        status: "active",
        votesFor: 1250000,
        votesAgainst: 350000,
        totalVotes: 1600000,
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Proposal to increase the maximum validator commission cap from 10% to 12% to incentivize more professional validator operations.",
        quorumReached: true,
      },
      {
        id: "prop-2",
        title: "Add New Lending Market for RLB Token",
        protocol: "Kamino Finance",
        status: "active",
        votesFor: 890000,
        votesAgainst: 210000,
        totalVotes: 1100000,
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Create a new isolated lending market for RLB (Rollbit) token with conservative risk parameters.",
        quorumReached: true,
      },
      {
        id: "prop-3",
        title: "Treasury Diversification into ETH",
        protocol: "Jito Foundation",
        status: "active",
        votesFor: 2100000,
        votesAgainst: 1200000,
        totalVotes: 3300000,
        endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Diversify 15% of treasury holdings into Wrapped ETH to reduce concentration risk.",
        quorumReached: true,
      },
      {
        id: "prop-4",
        title: "Reduce Oracle Update Frequency",
        protocol: "Pyth Network",
        status: "active",
        votesFor: 450000,
        votesAgainst: 850000,
        totalVotes: 1300000,
        endsAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Optimize costs by reducing oracle update frequency from 400ms to 1000ms for non-critical price feeds.",
        quorumReached: true,
      },
      {
        id: "prop-5",
        title: "Grant 500k USDC for Marketing Campaign",
        protocol: "Jupiter Exchange",
        status: "passed",
        votesFor: 3200000,
        votesAgainst: 800000,
        totalVotes: 4000000,
        endsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Allocate 500,000 USDC for Q1 2025 marketing campaign targeting institutional traders.",
        quorumReached: true,
      },
      {
        id: "prop-6",
        title: "Implement Fee Burn Mechanism",
        protocol: "Orca",
        status: "rejected",
        votesFor: 700000,
        votesAgainst: 1500000,
        totalVotes: 2200000,
        endsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: "Burn 50% of collected protocol fees to create deflationary pressure on ORCA token.",
        quorumReached: true,
      },
    ];

    // Filter based on status
    let filteredProposals = allProposals;
    if (status === "active") {
      filteredProposals = allProposals.filter(p => p.status === "active");
    } else if (status === "closed") {
      filteredProposals = allProposals.filter(p => p.status === "passed" || p.status === "rejected");
    }

    return NextResponse.json({
      success: true,
      proposals: filteredProposals,
      count: filteredProposals.length,
    });
  } catch (error: any) {
    console.error("Governance API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch governance data" },
      { status: 500 }
    );
  }
}
