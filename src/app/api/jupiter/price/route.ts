import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy to Jupiter Price API v6
// Docs: https://price.jup.ag
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids"); // e.g. SOL,MSOL,USDC (symbols)
    const mints = searchParams.get("mints"); // e.g. mint addresses comma-separated
    const vsToken = searchParams.get("vsToken") || undefined; // optional

    if (!ids && !mints) {
      return NextResponse.json({ error: "Missing ?ids or ?mints" }, { status: 400 });
    }

    // Mock mode: return deterministic prices to avoid external dependency in CI
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      const symbols = (ids || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const priceMap: Record<string, number> = { SOL: 150.12, MSOL: 162.34, USDC: 1.0, BONK: 0.000021, JUP: 1.25, WIF: 3.2, JTO: 3.85 };
      const data: Record<string, { price: number }> = {};
      for (const s of symbols) data[s] = { price: priceMap[s] ?? 1 };
      // For mints, just return 1 if symbol map not provided (kept simple for CI)
      if (!ids && mints) {
        const mm = mints.split(",").map((s) => s.trim()).filter(Boolean);
        for (const mint of mm) data[mint] = { price: 1 };
      }
      return NextResponse.json({ data }, { status: 200 });
    }

    // Build upstream URL depending on whether ids or mints provided
    const base = new URL("https://price.jup.ag/v6/price");
    if (ids) base.searchParams.set("ids", ids);
    if (mints) base.searchParams.set("mints", mints);
    if (vsToken) base.searchParams.set("vsToken", vsToken);

    // Attach Jupiter App ID header if provided via env
    const JUP_APP_ID = process.env.JUPITER_APP_ID || process.env.NEXT_PUBLIC_JUPITER_APP_ID;
    const headers: HeadersInit | undefined = JUP_APP_ID ? { "x-application-id": JUP_APP_ID } : undefined;

    // Try fetch with small retry
    let res: Response | null = null;
    let data: any = null;
    let lastErr: any = null;
    for (let i = 0; i < 2; i++) {
      try {
        res = await fetch(base.toString(), { next: { revalidate: 0 }, headers });
        data = await res.json();
        if (res.ok) {
          return NextResponse.json(data, { status: 200 });
        }
        lastErr = new Error(data?.error || res.statusText);
      } catch (e: any) {
        lastErr = e;
      }
      await new Promise((r) => setTimeout(r, 300 + i * 300));
    }

    // Fallback provider: DefiLlama Prices API (no key required)
    // Map requested assets -> DefiLlama identifiers and back to output keys
    const out: Record<string, { price: number }> = {};
    const idsArr = ids ? ids.split(",").map((v) => v.trim()).filter(Boolean) : [];
    const mintsArr = mints ? mints.split(",").map((v) => v.trim()).filter(Boolean) : [];

    const llamaKeys: string[] = [];
    const keyMapping: Array<{ llama: string; outKey: string }> = [];

    // Helper: push mapping
    const mapPush = (llama: string, outKey: string) => {
      llamaKeys.push(llama);
      keyMapping.push({ llama, outKey });
    };

    // Map ids
    for (const symRaw of idsArr) {
      const sym = symRaw.toUpperCase();
      if (sym === "SOL") mapPush("coingecko:solana", sym); else
      if (sym === "USDC") mapPush("solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", sym); else
      if (sym === "MSOL") mapPush("solana:mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", sym);
      // extend here if needed
    }

    // Map mints
    for (const mint of mintsArr) {
      const llamaId = mint === "So11111111111111111111111111111111111111112"
        ? "coingecko:solana"
        : `solana:${mint}`;
      mapPush(llamaId, mint);
    }

    let hadAnyFromLlama = false;
    if (llamaKeys.length) {
      try {
        const llamaUrl = new URL("https://coins.llama.fi/prices/current/" + encodeURIComponent(llamaKeys.join(",")));
        const r = await fetch(llamaUrl.toString(), { next: { revalidate: 0 } });
        if (r.ok) {
          const j = await r.json();
          const prices: Record<string, { price: number }> = j?.coins || {};
          for (const { llama, outKey } of keyMapping) {
            const p = prices[llama]?.price;
            if (typeof p === "number" && Number.isFinite(p)) {
              out[outKey] = { price: p };
            }
          }
          hadAnyFromLlama = Object.keys(out).length > 0;
          if (ids && !mints) {
            // If only ids were requested and we got some prices, return early
            if (hadAnyFromLlama) return NextResponse.json({ data: out, fallback: "defillama" }, { status: 200 });
          }
        }
      } catch (e) {
        lastErr = e;
      }
    }

    // Additional fallback for mints only (fill missing via DexScreener)
    if (mintsArr.length) {
      // Determine which mints are missing from 'out'
      const missing = mintsArr.filter((m) => out[m] == null);
      if (missing.length) {
        try {
          const dsUrl = new URL("https://api.dexscreener.com/latest/dex/tokens/" + missing.join(","));
          const r = await fetch(dsUrl.toString(), { next: { revalidate: 0 } });
          if (r.ok) {
            const j = await r.json();
            const pairs: Array<any> = j?.pairs || [];
            // Build map from mint -> best priceUsd
            const best: Record<string, number> = {};
            for (const p of pairs) {
              const tokenAddr = (p?.baseToken?.address || p?.quoteToken?.address || "").trim();
              const priceUsd = Number(p?.priceUsd);
              if (!tokenAddr || !Number.isFinite(priceUsd)) continue;
              // Prefer pairs quoted in USD/USDC/USDT by using higher liquidity and better quote
              const prev = best[tokenAddr];
              if (prev == null || (Number(p?.liquidity?.usd) || 0) > (Number.isFinite(prev) ? 0 : 0)) {
                best[tokenAddr] = priceUsd;
              }
            }
            for (const m of missing) {
              const p = best[m];
              if (typeof p === "number" && Number.isFinite(p)) {
                out[m] = { price: p };
              }
            }
          }
        } catch (e) {
          // ignore; we'll fall back to zeros below
        }
      }

      if (Object.keys(out).length) {
        return NextResponse.json({ data: out, fallback: hadAnyFromLlama ? "defillama+dexscreener" : "dexscreener" }, { status: 200 });
      }
    }

    // Graceful fallback: shape-compatible response with neutral prices
    const fallback: Record<string, { price: number }> = {};
    if (ids) {
      for (const s of ids.split(",").map((v) => v.trim()).filter(Boolean)) fallback[s.toUpperCase()] = { price: 0 };
    }
    if (mints) {
      for (const m of mints.split(",").map((v) => v.trim()).filter(Boolean)) fallback[m] = { price: 0 };
    }
    return NextResponse.json({ data: fallback, warning: `Upstream fetch failed: ${lastErr?.message || lastErr}` }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}