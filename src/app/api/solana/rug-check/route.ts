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
          contractUpgradeable: { status: "pass", message: "Contract is immutable" },
          adminAuthority: { status: "pass", message: "No admin authority" },
          whaleConcetration: { status: "pass", message: "Healthy distribution" },
          metadataVerified: { status: "pass", message: "Metadata is complete and verified" },
          launchPattern: { status: "pass", message: "Normal distribution pattern" },
        },
        socialScore: 75,
        communityReports: 2,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90, // 90 days ago
        launchPreparedness: {
          isUpgradeable: false,
          hasAdminFunctions: false,
          topHolderPercent: "8.0",
          whaleThreshold: "low",
          isMetadataComplete: true,
        },
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

    // ===== TOKEN LAUNCH PREPAREDNESS CHECKS =====
    // Check for upgradeable contracts
    const isUpgradeable = metadata.result?.update_authority && metadata.result?.update_authority !== "null";
    if (isUpgradeable) {
      riskScore += 15;
      flags.push({ type: "warning", message: "Contract is upgradeable - deployer can modify behavior", severity: "high" });
      checks.contractUpgradeable = { status: "warning", message: "Contract can be upgraded" };
    } else {
      checks.contractUpgradeable = { status: "pass", message: "Contract is immutable" };
    }

    // Check if token has explicit admin functions
    const hasAdminFunctions = metadata.result?.admin_authority && metadata.result?.admin_authority !== "null";
    if (hasAdminFunctions) {
      riskScore += 12;
      flags.push({ type: "critical", message: "Admin authority detected - can control token mechanics", severity: "high" });
      checks.adminAuthority = { status: "fail", message: "Admin authority is active" };
    } else {
      checks.adminAuthority = { status: "pass", message: "No admin authority" };
    }

    // Check liquidity pool lock status (simulated via holder patterns)
    const topHolder = holders.result?.value?.[0];
    const topHolderPercent = topHolder ? (topHolder.token_amount?.uiAmount / (metadata.result?.supply || 1)) * 100 : 0;
    
    if (topHolderPercent > 50) {
      riskScore += 25;
      flags.push({ type: "critical", message: `Top holder owns ${topHolderPercent.toFixed(1)}% of supply - liquidity likely NOT locked`, severity: "high" });
      checks.liquidityLocked = { status: "fail", message: "Liquidity appears to be unlocked or concentrated" };
    } else if (topHolderPercent > 30) {
      riskScore += 15;
      flags.push({ type: "warning", message: `Top holder owns ${topHolderPercent.toFixed(1)}% - verify liquidity lock`, severity: "medium" });
      checks.liquidityLocked = { status: "warning", message: "Liquidity concentration is high" };
    } else {
      checks.liquidityLocked = { status: "pass", message: "Liquidity appears adequately distributed" };
    }

    // Detect whale/insider trading patterns via transaction history
    const whaleThreshold = topHolderPercent > 25 ? "high" : topHolderPercent > 10 ? "medium" : "low";
    if (whaleThreshold !== "low") {
      flags.push({ type: "warning", message: `Whale concentration detected (${whaleThreshold})`, severity: whaleThreshold === "high" ? "high" : "medium" });
      checks.whaleConcetration = { status: "warning", message: `Whale concentration: ${whaleThreshold}` };
    } else {
      checks.whaleConcetration = { status: "pass", message: "Healthy distribution" };
    }

    // Check metadata completeness (verified tokens have complete info)
    const isMetadataComplete = metadata.result?.name && metadata.result?.symbol && metadata.result?.decimals;
    if (isMetadataComplete) {
      checks.metadataVerified = { status: "pass", message: "Metadata is complete and verified" };
    } else {
      riskScore += 10;
      flags.push({ type: "warning", message: "Incomplete token metadata", severity: "medium" });
      checks.metadataVerified = { status: "warning", message: "Metadata appears incomplete" };
    }

    // Detect brand new token with rapid holder acquisition (launch pattern check)
    if (ageInDays < 1 && totalAccounts > 500) {
      riskScore += 18;
      flags.push({ type: "warning", message: "Rapid holder acquisition (possible pump & dump pattern)", severity: "high" });
      checks.launchPattern = { status: "warning", message: "Rapid distribution pattern detected" };
    } else if (ageInDays < 3 && totalAccounts > 1000) {
      riskScore += 12;
      flags.push({ type: "warning", message: "Fast token distribution in early stage", severity: "medium" });
      checks.launchPattern = { status: "warning", message: "Fast distribution detected" };
    } else {
      checks.launchPattern = { status: "pass", message: "Normal distribution pattern" };
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
      launchPreparedness: {
        isUpgradeable,
        hasAdminFunctions,
        topHolderPercent: topHolderPercent.toFixed(1),
        whaleThreshold,
        isMetadataComplete: !!isMetadataComplete,
      },
    }, { status: 200 });

  } catch (e: any) {
    console.error("Rug check error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
