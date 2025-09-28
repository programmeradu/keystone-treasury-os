import { NextResponse } from "next/server";

// GET /api/yields?asset=USDC&chain=ethereum
// Uses DeFiLlama Yields API and returns top pools for the asset/chain
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const asset = (searchParams.get("asset") || "").toLowerCase();
  const chain = (searchParams.get("chain") || "").toLowerCase();

  try {
    const r = await fetch("https://yields.llama.fi/pools", { next: { revalidate: 60 } });
    if (!r.ok) {
      return NextResponse.json(
        { error: `DeFiLlama error: ${r.status} ${r.statusText}` },
        { status: r.status }
      );
    }
    const json = await r.json();
    const pools: any[] = json?.data || json?.pools || [];

    // Basic filters
    const filtered = pools.filter((p) => {
      const sym = (p.symbol || "").toLowerCase();
      const ch = (p.chain || "").toLowerCase();
      const okAsset = asset ? sym.includes(asset) : true;
      const okChain = chain ? ch === chain : true;
      return okAsset && okChain;
    });

    // Sort by APY desc, prefer higher TVL
    filtered.sort((a, b) => {
      const apyA = Number(a.apy || a.apyBase || 0);
      const apyB = Number(b.apy || b.apyBase || 0);
      if (apyA === apyB) {
        return Number(b.tvlUsd || 0) - Number(a.tvlUsd || 0);
      }
      return apyB - apyA;
    });

    const top = filtered.slice(0, 5).map((p) => ({
      project: p.project,
      chain: p.chain,
      symbol: p.symbol,
      apy: p.apy ?? p.apyBase ?? null,
      apyBase: p.apyBase ?? null,
      apyReward: p.apyReward ?? null,
      tvlUsd: p.tvlUsd ?? null,
      pool: p.pool,
      url: p.url || null,
    }));

    return NextResponse.json({ data: top });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Network error" }, { status: 500 });
  }
}