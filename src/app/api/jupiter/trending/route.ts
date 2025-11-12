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

    // Use multiple sources for trending tokens
    const sources: Array<() => Promise<any>> = [
      // Jupiter tokens list (most reliable, verified tokens)
      async () => {
        const r = await fetch("https://tokens.jup.ag/tokens?tags=verified", { 
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(5000)
        });
        if (!r.ok) throw new Error(`tokens list failed: ${r.status}`);
        const allTokens = await r.json();
        
        // Return a curated selection of popular/trending tokens
        const trending = ["BONK", "JUP", "WIF", "JTO", "PYTH", "ORCA", "RAY", "MNGO", "MOBILE", "RENDER"];
        const filtered = allTokens.filter((t: any) => trending.includes(t.symbol));
        
        return { data: filtered.map((t: any) => ({
          mint: t.address,
          symbol: t.symbol,
          name: t.name,
          icon: t.logoURI,
        })) };
      },
      // DexScreener trending pairs (backup)
      async () => {
        const searchRes = await fetch("https://api.dexscreener.com/latest/dex/search?q=solana", {
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(5000)
        });
        if (!searchRes.ok) throw new Error(`dexscreener failed: ${searchRes.status}`);
        const searchData = await searchRes.json();
        const pairs = searchData.pairs || [];
        
        // Filter for Solana pairs with good metrics
        const solanaPairs = pairs
          .filter((p: any) => p.chainId === 'solana' && p.volume?.h24 > 50000)
          .sort((a: any, b: any) => {
            const volA = a.volume?.h24 || 0;
            const volB = b.volume?.h24 || 0;
            return volB - volA;
          })
          .slice(0, 30);
        
        // Extract unique tokens
        const tokens = new Map();
        for (const pair of solanaPairs) {
          const baseToken = pair.baseToken;
          if (baseToken?.address && baseToken?.symbol && !["WSOL", "SOL", "USDC", "USDT", "WETH"].includes(baseToken.symbol)) {
            if (!tokens.has(baseToken.address)) {
              tokens.set(baseToken.address, {
                mint: baseToken.address,
                symbol: baseToken.symbol,
                name: baseToken.name,
                icon: pair.info?.imageUrl,
                volume24h: pair.volume?.h24,
                priceChange24h: pair.priceChange?.h24,
              });
            }
          }
        }
        
        return { data: Array.from(tokens.values()) };
      },
    ];

    let data: any = null;
    let lastErr: any = null;
    
    // Try each source with a timeout
    for (const fn of sources) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        data = await Promise.race([fn(), timeoutPromise]);
        if (data && data.data && data.data.length > 0) break;
      } catch (e) {
        console.error('Trending source error:', e);
        lastErr = e;
      }
    }

    // If all upstreams failed, return a safe fallback list with CORRECT addresses
    if (!data || !data.data || data.data.length === 0) {
      const fallback = [
        { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
        { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter" },
        { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat" },
        { mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", symbol: "JTO", name: "Jito" },
        { mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", symbol: "PYTH", name: "Pyth Network" },
        { mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", symbol: "ORCA", name: "Orca" },
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
    // As a last resort, return safe fallback with CORRECT addresses
    const fallback = [
      { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", name: "Bonk" },
      { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", name: "Jupiter" },
      { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", symbol: "WIF", name: "dogwifhat" },
      { mint: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", symbol: "JTO", name: "Jito" },
      { mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", symbol: "PYTH", name: "Pyth Network" },
      { mint: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj3sA9P3fjFCt", symbol: "ORCA", name: "Orca" },
    ];
    return NextResponse.json({ items: fallback.slice(0, Math.max(1, Math.min(10, Number(new URL(req.url).searchParams.get("limit") || 4)))) , warning: e?.message || String(e) }, { status: 200 });
  }
}