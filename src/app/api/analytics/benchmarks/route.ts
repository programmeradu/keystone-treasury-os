import { NextRequest, NextResponse } from "next/server";

/**
 * /api/analytics/benchmarks — Fetch benchmark price series for comparison
 *
 * Returns normalized % change series for SOL, BTC, ETH from CoinGecko.
 *
 * GET ?benchmarks=SOL,BTC,ETH&months=6
 */

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const COINGECKO_IDS: Record<string, string> = {
    SOL: "solana",
    BTC: "bitcoin",
    ETH: "ethereum",
    USDC: "usd-coin",
    BNB: "binancecoin",
    AVAX: "avalanche-2",
    MATIC: "matic-network",
    DOT: "polkadot",
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const benchmarkStr = searchParams.get("benchmarks") || "SOL,BTC,ETH";
        const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") || "6")));
        const benchmarks = benchmarkStr.split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

        const cacheKey = `benchmarks:${benchmarks.join(",")}:${months}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        const days = months * 30;
        const results: { symbol: string; data: { date: string; price: number; pctChange: number }[] }[] = [];

        // Fetch all benchmarks in parallel
        const promises = benchmarks.slice(0, 5).map(async (symbol) => {
            const cgId = COINGECKO_IDS[symbol];
            if (!cgId) return null;

            try {
                const url = `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
                const res = await fetch(url, { next: { revalidate: 3600 } });
                if (!res.ok) return null;

                const json = await res.json();
                if (!json.prices || !Array.isArray(json.prices)) return null;

                const prices: [number, number][] = json.prices;
                if (prices.length === 0) return null;

                const startPrice = prices[0][1];

                return {
                    symbol,
                    data: prices.map(([ts, price]) => ({
                        date: new Date(ts).toISOString().split("T")[0],
                        price: Math.round(price * 100) / 100,
                        pctChange: startPrice > 0 ? Math.round(((price - startPrice) / startPrice) * 10000) / 100 : 0,
                    })),
                };
            } catch {
                return null;
            }
        });

        const settled = await Promise.allSettled(promises);
        for (const r of settled) {
            if (r.status === "fulfilled" && r.value) {
                results.push(r.value);
            }
        }

        const result = {
            benchmarks: results,
            months,
            days,
            source: "coingecko",
            computedAt: Date.now(),
        };

        cache.set(cacheKey, { data: result, ts: Date.now() });

        return NextResponse.json(result, {
            headers: { "Cache-Control": "public, max-age=3600" },
        });
    } catch (err: any) {
        console.error("[Analytics/Benchmarks] Error:", err);
        return NextResponse.json({ error: err?.message || "Failed to fetch benchmarks" }, { status: 500 });
    }
}
