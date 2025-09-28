import { NextRequest } from "next/server";

// Lightweight proxy to DefiLlama Yields API without using @defillama/sdk
// Docs/reference endpoints:
// - https://yields.llama.fi/pools
// - https://yields.llama.fi/chart/:pool
// - https://yields.llama.fi/pools?chain=ethereum&project=aave-v2
const YIELDS_BASE = "https://yields.llama.fi";

export async function GET(req: NextRequest) {
  try {
    const { searchParams, pathname } = new URL(req.url);

    // Support custom endpoint path via ?endpoint=
    // Examples:
    // - endpoint=pools
    // - endpoint=chart/ethereum-aave-v2-DAI
    const endpoint = searchParams.get("endpoint") || "pools";

    // Rebuild query params excluding "endpoint"
    const qp = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) {
      if (k === "endpoint") continue;
      qp.set(k, v);
    }

    const url = `${YIELDS_BASE}/${endpoint}${qp.size ? `?${qp.toString()}` : ""}`;

    const upstream = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";
    return new Response(text, { status: upstream.status, headers: { "Content-Type": contentType } });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Yield Scanner proxy error", details: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}