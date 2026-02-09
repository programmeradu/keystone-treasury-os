import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fetch real LP APY data from multiple Solana DEXes
// Sources: Orca Whirlpools, Raydium, and fallback estimates
interface PoolData {
  pool: string;
  dex: string;
  pair: string;
  apy: number;
  tvl: number;
  volume24h?: number;
  fee?: number;
}

export async function GET() {
  const pools: PoolData[] = [];
  let warning: string | undefined;

  // ── Source 1: Orca Whirlpools via their API ───────────────────────
  try {
    const orcaRes = await fetch("https://api.mainnet.orca.so/v1/whirlpool/list", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (orcaRes.ok) {
      const data = await orcaRes.json();
      const whirlpools = data?.whirlpools || [];
      // Find SOL/USDC pools (various fee tiers)
      const solUsdcPools = whirlpools.filter((p: any) => {
        const a = (p.tokenA?.symbol || "").toUpperCase();
        const b = (p.tokenB?.symbol || "").toUpperCase();
        return (a === "SOL" && b === "USDC") || (a === "USDC" && b === "SOL");
      });
      for (const p of solUsdcPools.slice(0, 3)) {
        const tvl = Number(p.tvl) || 0;
        if (tvl < 10000) continue; // skip dust pools
        // Orca returns APR as decimals (0.15 = 15%), multiply by 100
        let rawApy = Number(p.totalApr?.day ?? p.feeApr?.day ?? p.reward_apr?.day ?? 0);
        // If value > 5 it's likely already in % form
        const apy = rawApy > 5 ? rawApy : rawApy * 100;
        pools.push({
          pool: p.address || "unknown",
          dex: "Orca",
          pair: "SOL/USDC",
          apy: Math.min(apy, 200), // sanity cap
          tvl,
          volume24h: Number(p.volume?.day) || undefined,
          fee: Number(p.lpFeeRate) || undefined,
        });
      }
    }
  } catch (e: any) {
    warning = `Orca fetch error: ${e?.message}`;
  }

  // ── Source 2: Raydium pools API ──────────────────────────────────
  try {
    const rayRes = await fetch("https://api-v3.raydium.io/pools/info/list?poolType=all&poolSortField=default&sortType=desc&pageSize=20&page=1", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (rayRes.ok) {
      const rayData = await rayRes.json();
      const rayPools = rayData?.data?.data || [];
      const solUsdcRay = rayPools.filter((p: any) => {
        const ids = (p.mintA?.symbol + "/" + p.mintB?.symbol).toUpperCase();
        return ids.includes("SOL") && ids.includes("USDC");
      });
      for (const p of solUsdcRay.slice(0, 3)) {
        const tvl = Number(p.tvl) || 0;
        if (tvl < 10000) continue;
        // Raydium returns APR already in percentage form (e.g. 39.02 = 39.02%)
        let rawApy = Number(p.day?.apr ?? p.day?.feeApr ?? 0);
        // If value > 5 it's likely already in % form; if < 5 it might be decimal
        const apy = rawApy > 5 ? rawApy : rawApy * 100;
        pools.push({
          pool: p.id || "unknown",
          dex: "Raydium",
          pair: `${p.mintA?.symbol}/${p.mintB?.symbol}`,
          apy: Math.min(apy, 200), // sanity cap
          tvl,
          volume24h: Number(p.day?.volume) || undefined,
          fee: Number(p.feeRate) || undefined,
        });
      }
    }
  } catch (e: any) {
    warning = (warning ? warning + "; " : "") + `Raydium fetch error: ${e?.message}`;
  }

  // ── Fallback estimates if no live data ─────────────────────────────
  if (pools.length === 0) {
    pools.push(
      { pool: "estimated", dex: "Orca", pair: "SOL/USDC", apy: 12.5, tvl: 45_000_000, volume24h: 8_000_000, fee: 0.003 },
      { pool: "estimated", dex: "Raydium", pair: "SOL/USDC", apy: 15.2, tvl: 32_000_000, volume24h: 12_000_000, fee: 0.0025 },
    );
    warning = (warning ? warning + "; " : "") + "Using estimated APY data";
  }

  // Sort by APY descending
  pools.sort((a, b) => b.apy - a.apy);

  return NextResponse.json(
    { pools, ...(warning ? { warning } : {}) },
    { status: 200, headers: { "Cache-Control": "private, max-age=60" } }
  );
}
