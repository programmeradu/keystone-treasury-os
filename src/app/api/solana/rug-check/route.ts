import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Rug Pull Detector - Analyzes token for red flags
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mint = searchParams.get("mint");

    if (!mint) {
      return NextResponse.json({ error: "Missing ?mint parameter" }, { status: 400 });
    }

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json({
        mint,
        riskScore: 35, // 0-100, higher = more risky
        verdict: "Low Risk",
        flags: [
          { type: "warning", message: "Top holder owns 8% of supply", severity: "medium" },
        ],
        checks: {
          liquidityLocked: { status: "pass", message: "Liquidity locked for 6 months" },
          topHolderConcentration: { status: "warning", message: "Top 10 holders own 35% of supply" },
          mintAuthority: { status: "pass", message: "Mint authority revoked" },
          freezeAuthority: { status: "pass", message: "Freeze authority revoked" },
          contractVerified: { status: "pass", message: "Contract source verified" },
          teamTokens: { status: "pass", message: "Team tokens vested" },
        },
        socialScore: 75,
        communityReports: 2,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90, // 90 days ago
      }, { status: 200 });
    }

    // Real implementation would:
    // 1. Fetch token metadata from Helius/Metaplex
    // 2. Check mint & freeze authorities
    // 3. Analyze holder distribution
    // 4. Check liquidity pool locks
    // 5. Query community reports database
    // 6. Calculate risk score

    const heliusKey = process.env.HELIUS_API_KEY;
    if (!heliusKey) {
      return NextResponse.json({
        error: "HELIUS_API_KEY not configured",
        mint,
        riskScore: null,
      }, { status: 500 });
    }

    // Fetch token metadata
    const metadataRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "rug-check",
        method: "getAsset",
        params: { id: mint },
      }),
      next: { revalidate: 0 },
    });

    const metadata = await metadataRes.json();
    
    // Analyze holder distribution via DAS
    const holderRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "holders",
        method: "getTokenAccounts",
        params: {
          mint,
          limit: 100,
        },
      }),
      next: { revalidate: 0 },
    });

    const holders = await holderRes.json();

    // Calculate risk score based on available data
    let riskScore = 0;
    const flags: Array<{ type: string; message: string; severity: string }> = [];
    const checks: Record<string, { status: string; message: string }> = {};

    // Check mint authority (if present = risky)
    const mintAuthority = metadata.result?.mint_authority;
    if (mintAuthority && mintAuthority !== "null") {
      riskScore += 30;
      flags.push({ type: "critical", message: "Mint authority is active - unlimited supply possible", severity: "high" });
      checks.mintAuthority = { status: "fail", message: "Mint authority active" };
    } else {
      checks.mintAuthority = { status: "pass", message: "Mint authority revoked" };
    }

    // Check freeze authority
    const freezeAuthority = metadata.result?.freeze_authority;
    if (freezeAuthority && freezeAuthority !== "null") {
      riskScore += 20;
      flags.push({ type: "critical", message: "Freeze authority active - tokens can be frozen", severity: "high" });
      checks.freezeAuthority = { status: "fail", message: "Freeze authority active" };
    } else {
      checks.freezeAuthority = { status: "pass", message: "Freeze authority revoked" };
    }

    // Check holder concentration
    const totalAccounts = holders.result?.total || 0;
    if (totalAccounts < 100) {
      riskScore += 15;
      flags.push({ type: "warning", message: `Only ${totalAccounts} token holders`, severity: "medium" });
      checks.topHolderConcentration = { status: "warning", message: `Low holder count: ${totalAccounts}` };
    } else {
      checks.topHolderConcentration = { status: "pass", message: `${totalAccounts}+ holders` };
    }

    // Age check (tokens < 7 days are higher risk)
    const createdAt = metadata.result?.created_at || Date.now();
    const ageInDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) {
      riskScore += 20;
      flags.push({ type: "warning", message: `Token is very new (${ageInDays.toFixed(0)} days old)`, severity: "medium" });
    }

    // Determine verdict
    let verdict = "Unknown";
    if (riskScore >= 70) verdict = "High Risk - Likely Rug";
    else if (riskScore >= 40) verdict = "Medium Risk - Use Caution";
    else verdict = "Low Risk";

    return NextResponse.json({
      mint,
      riskScore: Math.min(riskScore, 100),
      verdict,
      flags,
      checks,
      socialScore: Math.max(0, 100 - riskScore), // Inverse of risk
      communityReports: 0, // Would come from a database
      createdAt,
      ageInDays: Math.floor(ageInDays),
    }, { status: 200 });

  } catch (e: any) {
    console.error("Rug check error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
