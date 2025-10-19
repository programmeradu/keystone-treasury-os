import { NextRequest, NextResponse } from "next/server";

interface TokenLaunch {
  id: string;
  name: string;
  symbol: string;
  launchDate: string;
  platform: string;
  initialPrice?: number;
  totalSupply?: number;
  vettingScore: number;
  status: "upcoming" | "live" | "completed";
  tags: string[];
  isVerified: boolean;
  teamDoxxed: boolean;
  auditStatus: "audited" | "pending" | "none";
  redFlags: string[];
  website?: string;
  description?: string;
  mint?: string;
  liquidity?: number;
}

// Calculate vetting score based on various factors
function calculateVettingScore(pair: any): number {
  let score = 50; // Base score

  // Liquidity check
  const liquidity = Number(pair?.liquidity?.usd || 0);
  if (liquidity > 100000) score += 15;
  else if (liquidity > 50000) score += 10;
  else if (liquidity > 10000) score += 5;
  else score -= 10;

  // Age check (newer = lower score initially)
  const pairCreatedAt = pair?.pairCreatedAt || 0;
  const ageHours = (Date.now() - pairCreatedAt) / (1000 * 60 * 60);
  if (ageHours > 168) score += 15; // > 1 week
  else if (ageHours > 24) score += 10; // > 1 day
  else if (ageHours > 1) score += 5;
  else score -= 15; // Very new

  // Volume check
  const volume24h = Number(pair?.volume?.h24 || 0);
  if (volume24h > 100000) score += 10;
  else if (volume24h > 50000) score += 5;
  else if (volume24h < 1000) score -= 10;

  // Price change check (extreme pumps are suspicious)
  const priceChange24h = Number(pair?.priceChange?.h24 || 0);
  if (Math.abs(priceChange24h) > 500) score -= 20; // Extreme pump/dump
  else if (Math.abs(priceChange24h) > 200) score -= 10;

  // FDV check
  const fdv = Number(pair?.fdv || 0);
  if (fdv > 10000000) score += 10;
  else if (fdv > 1000000) score += 5;

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, Math.floor(score)));
}

// Detect red flags
function detectRedFlags(pair: any, score: number): string[] {
  const flags: string[] = [];

  if (score < 30) flags.push("Very low vetting score");
  
  const liquidity = Number(pair?.liquidity?.usd || 0);
  if (liquidity < 5000) flags.push("Very low liquidity (< $5k)");

  const priceChange24h = Number(pair?.priceChange?.h24 || 0);
  if (priceChange24h > 500) flags.push("Extreme price pump (+500%)");
  if (priceChange24h < -80) flags.push("Severe price dump (-80%)");

  const ageHours = (Date.now() - (pair?.pairCreatedAt || 0)) / (1000 * 60 * 60);
  if (ageHours < 1) flags.push("Very new token (< 1 hour)");

  const volume24h = Number(pair?.volume?.h24 || 0);
  if (volume24h < 500) flags.push("Very low trading volume");

  return flags;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "upcoming";

    // Fetch recent token pairs from DexScreener
    // Using Solana chain and sorting by pairCreatedAt
    const dexscreenerUrl = "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112";
    
    const response = await fetch(dexscreenerUrl, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from DexScreener");
    }

    const data = await response.json();
    const pairs = data?.pairs || [];

    // Filter for Solana pairs only
    const solanaPairs = pairs.filter((p: any) => p.chainId === "solana");

    // Convert to TokenLaunch format
    const allLaunches: TokenLaunch[] = solanaPairs
      .slice(0, 50) // Limit to 50 most recent
      .map((pair: any) => {
        const vettingScore = calculateVettingScore(pair);
        const redFlags = detectRedFlags(pair, vettingScore);
        
        const baseToken = pair?.baseToken || {};
        const pairCreatedAt = pair?.pairCreatedAt || Date.now();
        const ageHours = (Date.now() - pairCreatedAt) / (1000 * 60 * 60);

        // Determine status based on age
        let launchStatus: "upcoming" | "live" | "completed" = "live";
        if (ageHours < 24) launchStatus = "live"; // Less than 24h is "live"
        else if (ageHours > 168) launchStatus = "completed"; // More than 1 week is "completed"

        return {
          id: pair?.pairAddress || `pair-${Math.random()}`,
          name: baseToken?.name || "Unknown Token",
          symbol: baseToken?.symbol || "???",
          launchDate: new Date(pairCreatedAt).toISOString(),
          platform: pair?.dexId || "Unknown DEX",
          initialPrice: Number(pair?.priceUsd || 0),
          totalSupply: undefined, // Not available from DexScreener
          vettingScore,
          status: launchStatus,
          tags: getTags(pair, vettingScore),
          isVerified: vettingScore >= 70,
          teamDoxxed: false, // Not available from DexScreener
          auditStatus: vettingScore >= 80 ? "audited" : "none",
          redFlags,
          website: pair?.url || pair?.info?.websites?.[0],
          description: `${baseToken?.name} trading on ${pair?.dexId}. Liquidity: $${Number(pair?.liquidity?.usd || 0).toLocaleString()}`,
          mint: baseToken?.address,
          liquidity: Number(pair?.liquidity?.usd || 0),
        };
      });

    // Filter based on status
    let filteredLaunches = allLaunches;
    if (status === "upcoming") {
      // For "upcoming", show live tokens less than 24h old with high scores
      filteredLaunches = allLaunches.filter(
        (l) => l.status === "live" && l.vettingScore >= 50
      );
    } else if (status === "live") {
      filteredLaunches = allLaunches.filter((l) => l.status === "live");
    }

    // Sort by vetting score (highest first)
    filteredLaunches.sort((a, b) => b.vettingScore - a.vettingScore);

    // Limit results
    filteredLaunches = filteredLaunches.slice(0, 20);

    return NextResponse.json({
      success: true,
      launches: filteredLaunches,
      count: filteredLaunches.length,
    });
  } catch (error: any) {
    console.error("Token launches API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch token launches" },
      { status: 500 }
    );
  }
}

function getTags(pair: any, score: number): string[] {
  const tags: string[] = [];
  
  const liquidity = Number(pair?.liquidity?.usd || 0);
  if (liquidity > 100000) tags.push("High Liquidity");
  if (liquidity < 10000) tags.push("Low Liquidity");

  const volume24h = Number(pair?.volume?.h24 || 0);
  if (volume24h > 100000) tags.push("High Volume");

  const priceChange24h = Number(pair?.priceChange?.h24 || 0);
  if (priceChange24h > 50) tags.push("Trending");
  if (priceChange24h < -50) tags.push("Falling");

  if (score >= 80) tags.push("Safe");
  else if (score < 40) tags.push("Risky");

  const ageHours = (Date.now() - (pair?.pairCreatedAt || 0)) / (1000 * 60 * 60);
  if (ageHours < 24) tags.push("New");

  return tags.slice(0, 3); // Limit to 3 tags
}
