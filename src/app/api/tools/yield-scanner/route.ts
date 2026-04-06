import { NextRequest } from "next/server";

// Lightweight proxy to DefiLlama Yields API without using @defillama/sdk
// Docs/reference endpoints:
// - https://yields.llama.fi/pools
// - https://yields.llama.fi/chart/:pool
// - https://yields.llama.fi/pools?chain=ethereum&project=aave-v2
const YIELDS_BASE = "https://yields.llama.fi";

// SECURITY: Whitelist of allowed endpoint paths to prevent SSRF attacks
const ALLOWED_ENDPOINTS = new Set([
  "pools",
  "pools/",
  "chart",
  "chart/",
  "pools/ethereum",
  "pools/solana",
  "pools/polygon",
  "pools/arbitrum",
  "pools/optimism",
  "pools/bsc",
  "pools/avalanche",
]);

function isAllowedEndpoint(endpoint: string): boolean {
  // Normalize the endpoint
  const normalized = endpoint.replace(/^\/+/, "").split("?")[0];
  return ALLOWED_ENDPOINTS.has(normalized) || normalized.match(/^chart\/[a-z0-9-]+$/i) !== null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Support custom endpoint path via ?endpoint=
    // Examples:
    // - endpoint=pools
    // - endpoint=chart/ethereum-aave-v2-DAI
    let endpoint = searchParams.get("endpoint") || "pools";

    // SECURITY: Validate endpoint is in whitelist to prevent SSRF
    if (!isAllowedEndpoint(endpoint)) {
      return new Response(
        JSON.stringify({
          error: "Invalid endpoint",
          message: `Endpoint "${endpoint}" is not allowed. Allowed endpoints: ${Array.from(ALLOWED_ENDPOINTS).join(", ")}`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rebuild query params excluding "endpoint" and only allow safe params
    const qp = new URLSearchParams();
    const SAFE_PARAMS = new Set(["chain", "project", "pool", "limit", "offset", "minApy", "maxApy"]);
    for (const [k, v] of searchParams.entries()) {
      if (k === "endpoint") continue;
      if (SAFE_PARAMS.has(k) && typeof v === "string") {
        qp.set(k, v);
      }
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