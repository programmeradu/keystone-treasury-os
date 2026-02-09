import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Moralis Trending Tokens for Solana
// Primary: getTrendingTokens (cross-chain, filtered to Solana)
// Secondary: Pump Fun graduated tokens for fresh DeFi discoveries
// Fallback: curated static list

interface TrendingItem {
  mint: string;
  symbol: string;
  name?: string;
  icon?: string;
  priceUsd?: number;
  volume24h?: number;
  priceChange24h?: number;
}

const FALLBACK_ITEMS: TrendingItem[] = [
  { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat", icon: "https://bafkreibk3covs5ltyqxa272uodhber7flse52bsqcg5rycjvsc5e2adem4.ipfs.nftstorage.link" },
  { mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", symbol: "JTO", name: "Jito", icon: "https://metadata.jup.ag/token/jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL/logo" },
  { mint: "RENDERnRG6yjAaPiTj8gNiHKHmRiLJUPCZPKUy2sGEz", symbol: "RENDER", name: "Render Token", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/RENDERnRG6yjAaPiTj8gNiHKHmRiLJUPCZPKUy2sGEz/logo.png" },
  { mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey", symbol: "MNDE", name: "Marinade", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey/logo.png" },
  { mint: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", symbol: "stSOL", name: "Lido Staked SOL", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png" },
  { mint: "mb1eu7TzEc71KxDpsmsKoucSSuuo6KWzZ3RPQnkBrNU", symbol: "MOBILE", name: "Helium Mobile", icon: "https://shdw-drive.genesysgo.net/6tcnBSybPG7piEDShBcrVtYJDPSvGrDbVvXmXKpzBvWP/mobile.png" },
  { mint: "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7", symbol: "DRIFT", name: "Drift Protocol", icon: "https://metadata.jup.ag/token/DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7/logo" },
  { mint: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6", symbol: "TNSR", name: "Tensor", icon: "https://metadata.jup.ag/token/TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6/logo" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") || 8)));
  const apiKey = process.env.MORALIS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { items: FALLBACK_ITEMS.slice(0, limit), source: "fallback", warning: "MORALIS_API_KEY not configured" },
      { status: 200 }
    );
  }

  const headers: HeadersInit = {
    accept: "application/json",
    "X-API-Key": apiKey,
  };

  let items: TrendingItem[] = [];
  let source = "moralis";
  let warning: string | undefined;

  // ── Source 1: Moralis getTrendingTokens ────────────────────────────
  try {
    const trendingRes = await fetch(
      `https://deep-index.moralis.io/api/v2.2/tokens/trending?chain=solana&limit=${limit + 10}`,
      { headers, signal: AbortSignal.timeout(6000), cache: "no-store" }
    );
    if (trendingRes.ok) {
      const data = await trendingRes.json();
      const raw = Array.isArray(data) ? data : data?.result || data?.tokens || data?.data || [];
      for (const t of raw) {
        const mint = t.tokenAddress || t.token_address || t.mint || t.address || "";
        const symbol = t.symbol || t.ticker || "";
        if (!mint || !symbol) continue;
        items.push({
          mint,
          symbol,
          name: t.name || undefined,
          icon: t.logo || t.logoURI || t.thumbnail || t.icon || undefined,
          priceUsd: Number(t.usdPrice ?? t.price_usd ?? t.priceUsd ?? t.price) || undefined,
          volume24h: Number(t.totalVolume?.["24h"] ?? t.volume_24h ?? t.volume24h) || undefined,
          priceChange24h: Number(t.pricePercentChange?.["24h"] ?? t.price_24h_percent_change ?? t.priceChange24h) || undefined,
        });
      }
    } else {
      warning = `Moralis trending returned ${trendingRes.status}`;
    }
  } catch (e: any) {
    warning = `Moralis trending error: ${e?.message || e}`;
  }

  // ── Source 2: Pump Fun graduated tokens (supplement if we need more) ──
  if (items.length < limit) {
    try {
      const graduatedRes = await fetch(
        `https://solana-gateway.moralis.io/token/mainnet/exchange/pumpfun/graduated`,
        { headers, signal: AbortSignal.timeout(5000), cache: "no-store" }
      );
      if (graduatedRes.ok) {
        const gData = await graduatedRes.json();
        const gRaw = Array.isArray(gData) ? gData : gData?.result || gData?.tokens || gData?.data || [];
        const existingMints = new Set(items.map((i) => i.mint));
        for (const t of gRaw) {
          if (items.length >= limit) break;
          const mint = t.token_address || t.tokenAddress || t.mint || t.address || "";
          const symbol = t.symbol || t.ticker || "";
          if (!mint || !symbol || existingMints.has(mint)) continue;
          existingMints.add(mint);
          items.push({
            mint,
            symbol,
            name: t.name || undefined,
            icon: t.logo || t.logoURI || t.thumbnail || t.icon || undefined,
            priceUsd: Number(t.price_usd ?? t.priceUsd ?? t.usd_price ?? t.price) || undefined,
            volume24h: Number(t.volume_24h ?? t.volume24h ?? t.volume_usd) || undefined,
            priceChange24h: Number(t.price_24h_percent_change ?? t.priceChange24h ?? t.price_change_24h) || undefined,
          });
        }
        if (!source.includes("pumpfun")) source += "+pumpfun";
      }
    } catch {
      // Non-critical, just supplement
    }
  }

  // ── Fallback if both sources failed ───────────────────────────────
  if (items.length === 0) {
    return NextResponse.json(
      { items: FALLBACK_ITEMS.slice(0, limit), source: "fallback", warning: warning || "All Moralis sources failed" },
      { status: 200 }
    );
  }

  // Exclude core tokens, stablecoins, and wrapped SOL — these already appear in the hero grid
  const EXCLUDE_SYMBOLS = new Set(["SOL", "WSOL", "USDC", "USDT", "MSOL", "JUP", "BONK", "PYTH", "RAY", "ORCA"]);
  items = items.filter((t) => !EXCLUDE_SYMBOLS.has(t.symbol.toUpperCase()));

  return NextResponse.json(
    { items: items.slice(0, limit), source, ...(warning ? { warning } : {}) },
    { status: 200, headers: { "Cache-Control": "private, max-age=30" } }
  );
}
