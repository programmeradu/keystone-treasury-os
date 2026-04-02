import { NextRequest, NextResponse } from "next/server";

type TokenMeta = {
  price: number;
  symbol?: string;
  name?: string;
  logo?: string;
  change24h?: number;
  liquidity?: number;
};

const WELL_KNOWN: Record<string, { symbol: string; name: string; logo: string; price?: number }> = {
  So11111111111111111111111111111111111111112: { symbol: "SOL", name: "Solana", logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", name: "USD Coin", logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", price: 1.0 },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: "USDT", name: "Tether USD", logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg", price: 1.0 },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: "JUP", name: "Jupiter", logo: "https://static.jup.ag/jup/icon.png" },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: "BONK", name: "Bonk", logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I" },
};

const CACHE_TTL_MS = 120_000;
const cache = new Map<string, { expiresAt: number; data: TokenMeta }>();
const dexChunkInflight = new Map<string, Promise<any>>();

const breaker = {
  failureCount: 0,
  openedUntil: 0,
};

function isBreakerOpen(): boolean {
  return Date.now() < breaker.openedUntil;
}

function registerFailure() {
  breaker.failureCount += 1;
  if (breaker.failureCount >= 4) {
    breaker.openedUntil = Date.now() + 30_000;
    breaker.failureCount = 0;
    console.warn("[token-metadata] DexScreener circuit opened for 30s");
  }
}

function registerSuccess() {
  breaker.failureCount = 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

async function fetchJsonWithRetry(url: string, retries = 3): Promise<any> {
  let delay = 400;
  for (let i = 0; i <= retries; i += 1) {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return res.json();
    if (!isRetryableStatus(res.status) || i === retries) {
      throw new Error(`Upstream ${res.status}: ${url}`);
    }
    await sleep(Math.min(delay, 2000));
    delay *= 2;
  }
  throw new Error(`Retry exhausted: ${url}`);
}

function splitChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) chunks.push(items.slice(i, i + chunkSize));
  return chunks;
}

async function fetchDexChunk(ids: string[]): Promise<any> {
  const key = ids.join(",");
  const existing = dexChunkInflight.get(key);
  if (existing) return existing;
  const promise = fetchJsonWithRetry(`https://api.dexscreener.com/latest/dex/tokens/${key}`, 2)
    .finally(() => {
      dexChunkInflight.delete(key);
    });
  dexChunkInflight.set(key, promise);
  return promise;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mintsRaw = Array.isArray(body?.mints) ? body.mints : [];
    const mints = [...new Set(mintsRaw.filter((m: unknown): m is string => typeof m === "string" && m.length > 20))].slice(0, 200);
    if (mints.length === 0) {
      return NextResponse.json({ metadata: {} });
    }

    const metadata: Record<string, TokenMeta> = {};
    const unresolved: string[] = [];

    for (const mint of mints) {
      const cached = cache.get(mint);
      if (cached && cached.expiresAt > Date.now()) {
        metadata[mint] = cached.data;
        continue;
      }
      const wk = WELL_KNOWN[mint];
      if (wk) {
        metadata[mint] = { price: wk.price ?? 0, symbol: wk.symbol, name: wk.name, logo: wk.logo, change24h: 0 };
      }
      unresolved.push(mint);
    }

    if (!isBreakerOpen() && unresolved.length > 0) {
      try {
        const chunks = splitChunks(unresolved, 30);
        const responses = await Promise.all(chunks.map((chunk) => fetchDexChunk(chunk)));
        const mintSet = new Set(unresolved);
        for (const data of responses) {
          if (!data?.pairs) continue;
          for (const pair of data.pairs as any[]) {
            const baseMint = pair?.baseToken?.address;
            const quoteMint = pair?.quoteToken?.address;
            const liq = Number(pair?.liquidity?.usd || 0);
            const change24h = pair?.priceChange?.h24 ? parseFloat(pair.priceChange.h24) : 0;
            if (baseMint && mintSet.has(baseMint)) {
              const price = parseFloat(pair?.priceUsd || "0");
              const existing = metadata[baseMint];
              if (!existing || liq > Number(existing.liquidity || 0)) {
                metadata[baseMint] = {
                  ...existing,
                  price: Number.isFinite(price) ? price : existing?.price || 0,
                  symbol: existing?.symbol || pair?.baseToken?.symbol,
                  name: existing?.name || pair?.baseToken?.name,
                  logo: pair?.info?.imageUrl || existing?.logo,
                  change24h,
                  liquidity: liq,
                };
              }
            }
            if (quoteMint && mintSet.has(quoteMint)) {
              const existing = metadata[quoteMint];
              metadata[quoteMint] = {
                ...existing,
                price: existing?.price || 0,
                symbol: existing?.symbol || pair?.quoteToken?.symbol,
                name: existing?.name || pair?.quoteToken?.name,
                logo: existing?.logo,
                change24h: existing?.change24h || 0,
              };
            }
          }
        }
        registerSuccess();
      } catch (error) {
        registerFailure();
        console.warn("[token-metadata] DexScreener fetch failed:", error);
      }
    }

    const missingSymbols = mints.filter((m) => !metadata[m]?.symbol || metadata[m]?.symbol === "SPL");
    await Promise.allSettled(missingSymbols.map(async (mint) => {
      const res = await fetch(`https://tokens.jup.ag/token/${mint}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return;
      const info = await res.json();
      if (!info?.symbol) return;
      const existing = metadata[mint];
      metadata[mint] = {
        ...existing,
        price: existing?.price || 0,
        symbol: existing?.symbol && existing.symbol !== "SPL" ? existing.symbol : info.symbol,
        name: existing?.name && existing.name !== "Unknown Token" ? existing.name : info.name,
        logo: existing?.logo || info.logoURI || undefined,
        change24h: existing?.change24h || 0,
      };
    }));

    const noPrice = mints.filter((m) => !metadata[m]?.price || metadata[m].price === 0);
    if (noPrice.length > 0) {
      try {
        const json = await fetchJsonWithRetry(`https://lite-api.jup.ag/price/v2?ids=${noPrice.join(",")}`, 2);
        for (const mint of noPrice) {
          const price = Number(json?.data?.[mint]?.price || 0);
          if (price > 0) {
            metadata[mint] = { ...metadata[mint], price };
          }
        }
      } catch (error) {
        console.warn("[token-metadata] Jupiter price fallback failed:", error);
      }
    }

    for (const mint of mints) {
      const wk = WELL_KNOWN[mint];
      if (!metadata[mint]) metadata[mint] = { price: wk?.price ?? 0 };
      if (!metadata[mint].logo && wk?.logo) metadata[mint].logo = wk.logo;
      cache.set(mint, { data: metadata[mint], expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return NextResponse.json({ metadata, breakerOpen: isBreakerOpen() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch token metadata" },
      { status: 500 },
    );
  }
}
