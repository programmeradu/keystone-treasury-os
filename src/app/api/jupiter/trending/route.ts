import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Heuristic trending tokens using Jupiter Token API V2 or tokens list fallback
// Returns: { items: Array<{ mint: string; symbol: string; name?: string; icon?: string }> }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(10, Number(searchParams.get("limit") || 4)));

    // Mock mode for CI/stability
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      const mock = [
        { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
        { mint: "HqB7uswoV8K8JmN8iAz4wT77iyN2U8kKj3sA9P3fjFCt", symbol: "JTO", name: "Jito" },
        { mint: "7dnZb77K9dwe4Yxx43EYLw5Q75CV24JfBBAZK5Qx1i7R", symbol: "WIF", name: "dogwifhat" },
        { mint: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", symbol: "JUP", name: "Jupiter" },
      ];
      return NextResponse.json({ items: mock.slice(0, limit) }, { status: 200 });
    }

    const headers: HeadersInit = {};
    const JUP_APP_ID = process.env.JUPITER_APP_ID || process.env.NEXT_PUBLIC_JUPITER_APP_ID;
    if (JUP_APP_ID) headers["x-application-id"] = JUP_APP_ID;

    // Try multiple Jupiter sources in order of preference
    const sources: Array<() => Promise<any>> = [
      // Hypothetical/top list (Pro)
      async () => {
        const u = new URL("https://api.jup.ag/tokens/v2/top");
        u.searchParams.set("chain", "solana");
        u.searchParams.set("limit", "50");
        const r = await fetch(u.toString(), { headers, next: { revalidate: 0 } });
        if (!r.ok) throw new Error(`jup pro top failed: ${r.status}`);
        return r.json();
      },
      // Lite mirror
      async () => {
        const u = new URL("https://lite-api.jup.ag/tokens/v2/top");
        u.searchParams.set("chain", "solana");
        u.searchParams.set("limit", "50");
        const r = await fetch(u.toString(), { headers, next: { revalidate: 0 } });
        if (!r.ok) throw new Error(`jup lite top failed: ${r.status}`);
        return r.json();
      },
      // Old tokens list (metadata only)
      async () => {
        const u = new URL("https://tokens.jup.ag/tokens");
        u.searchParams.set("tags", "verified");
        const r = await fetch(u.toString(), { next: { revalidate: 0 } });
        if (!r.ok) throw new Error(`tokens list failed: ${r.status}`);
        return r.json();
      },
    ];

    let data: any = null;
    let lastErr: any = null;
    for (const fn of sources) {
      try {
        data = await fn();
        if (data) break;
      } catch (e) {
        lastErr = e;
      }
    }

    // If all upstreams failed, return a safe fallback list so UI keeps updating
    if (!data) {
      const fallback = [
        { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
        { mint: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", symbol: "JUP", name: "Jupiter" },
        { mint: "7dnZb77K9dwe4Yxx43EYLw5Q75CV24JfBBAZK5Qx1i7R", symbol: "WIF", name: "dogwifhat" },
        { mint: "HqB7uswoV8K8JmN8iAz4wT77iyN2U8kKj3sA9P3fjFCt", symbol: "JTO", name: "Jito" },
      ].slice(0, limit);
      return NextResponse.json({ items: fallback, warning: `Upstream trending failed: ${lastErr?.message || lastErr}` }, { status: 200 });
    }

    const items: Array<{ mint: string; symbol: string; name?: string; icon?: string; volume24h?: number; priceChange24h?: number }>
      = Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.tokens) ? data.tokens
      : Array.isArray(data) ? data
      : [];

    // Normalize
    const normalized = items.map((t: any) => ({
      mint: t.mintAddress || t.address || t.mint || "",
      symbol: t.symbol || t.ticker || "",
      name: t.name || undefined,
      icon: t.logoURI || t.icon || undefined,
      volume24h: t.volume24h || t.stats?.volume24h || t.metrics?.volume24h,
      priceChange24h: t.priceChange24h || t.stats?.priceChange24h || t.metrics?.priceChange24h,
    }))
      .filter((t: any) => t.mint && t.symbol && !["SOL", "MSOL", "USDC", "USDT"].includes(t.symbol.toUpperCase()));

    // Rank by available signals: 24h volume, then 24h price change, else keep order
    normalized.sort((a: any, b: any) => {
      const va = Number(a.volume24h) || 0;
      const vb = Number(b.volume24h) || 0;
      if (vb !== va) return vb - va;
      const ca = Number(a.priceChange24h) || 0;
      const cb = Number(b.priceChange24h) || 0;
      return cb - ca;
    });

    const top = normalized.slice(0, limit);
    return NextResponse.json({ items: top }, { status: 200 });
  } catch (e: any) {
    // As a last resort, return safe fallback with 200 to avoid breaking UI
    const fallback = [
      { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
      { mint: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", symbol: "JUP", name: "Jupiter" },
      { mint: "7dnZb77K9dwe4Yxx43EYLw5Q75CV24JfBBAZK5Qx1i7R", symbol: "WIF", name: "dogwifhat" },
      { mint: "HqB7uswoV8K8JmN8iAz4wT77iyN2U8kKj3sA9P3fjFCt", symbol: "JTO", name: "Jito" },
    ];
    return NextResponse.json({ items: fallback.slice(0, Math.max(1, Math.min(10, Number(new URL(req.url).searchParams.get("limit") || 4)))) , warning: e?.message || String(e) }, { status: 200 });
  }
}