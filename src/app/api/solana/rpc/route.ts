import { NextRequest, NextResponse } from "next/server";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

export const dynamic = "force-dynamic";

// In-memory cache for RPC responses (5 second TTL)
const rpcCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5000;

function getCacheKey(method: string, params: any): string {
  return `${method}:${JSON.stringify(params)}`;
}

function getCachedResult(key: string): { data: any; fromCache: boolean } | null {
  const cached = rpcCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    rpcCache.delete(key);
    return null;
  }
  return { data: cached.data, fromCache: true };
}

function setCachedResult(key: string, data: any): void {
  if (rpcCache.size > 1000) {
    const oldestKey = rpcCache.keys().next().value;
    if (oldestKey) rpcCache.delete(oldestKey);
  }
  rpcCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Minimal JSON-RPC proxy for Solana mainnet
// Auto-selects endpoint (public RPC by default; uses Helius when HELIUS_API_KEY is set). No env vars required.
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 100 requests/hour per user for RPC calls
    const rateLimit = await checkRouteLimit(req, "atlas_tx_lookups");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `RPC rate limit reached. Try again after ${rateLimit.resetAt.toISOString()}`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const publicRpc = process.env.NEXT_PUBLIC_SOLANA_RPC;
    const heliusKey = process.env.HELIUS_API_KEY;
    const endpoint = publicRpc || (heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusKey)}` : "https://api.mainnet-beta.solana.com");
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";

    const raw = await req.text();

    // Parse request for caching
    let body: any = {};
    try { body = JSON.parse(raw || "{}"); } catch {}
    const method = body?.method;
    const params = body?.params || [];

    // Check cache first
    if (method && !mockMode) {
      const cacheKey = getCacheKey(method, params);
      const cached = getCachedResult(cacheKey);
      if (cached) {
        return NextResponse.json(cached.data, {
          status: 200,
          headers: { "X-Cache": "HIT" },
        });
      }
    }

    // Mock mode: synthesize responses for common methods used by Atlas
    if (mockMode) {
      const id = body?.id ?? 1;

      // Basic handlers
      if (method === "getInflationRate") {
        return NextResponse.json({ jsonrpc: "2.0", id, result: { epoch: 0, foundation: 0, total: 0.07, validator: 0.07 } });
      }
      if (method === "getBalance") {
        // 10 SOL default
        return NextResponse.json({ jsonrpc: "2.0", id, result: { context: { slot: 0 }, value: 10_000_000_000 } });
      }
      if (method === "getTokenAccountsByOwner") {
        // Return empty list by default
        return NextResponse.json({ jsonrpc: "2.0", id, result: { context: { slot: 0 }, value: [] } });
      }
      if (method === "getLatestBlockhash") {
        return NextResponse.json({ jsonrpc: "2.0", id, result: { context: { slot: 0 }, value: { blockhash: "MockBlockhash111", lastValidBlockHeight: 0 } } });
      }
      // Fallback generic ok
      return NextResponse.json({ jsonrpc: "2.0", id, result: null });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: raw,
      // Avoid caching RPC
      next: { revalidate: 0 },
    });

    // Pipe through status + JSON
    const data = await res.json().catch(async () => {
      const text = await res.text();
      return { error: "Upstream non-JSON response", upstream: text };
    });

    // Cache successful responses
    if (method && res.ok) {
      const cacheKey = getCacheKey(method, params);
      setCachedResult(cacheKey, data);
    }

    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}