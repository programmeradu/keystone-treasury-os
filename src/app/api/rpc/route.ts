import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic mapping for demo-default chains -> NowNodes RPC hostnames
const HOSTS: Record<string, string> = {
  ethereum: "https://eth.nownodes.io",
  arbitrum: "https://arbitrum.nownodes.io",
  base: "https://base.nownodes.io",
  polygon: "https://polygon.nownodes.io",
  matic: "https://matic.nownodes.io",
  bnb: "https://bsc.nownodes.io",
  bsc: "https://bsc.nownodes.io",
};

// Enhanced fallback mapping with more public/robust endpoints
const PUBLIC_HOSTS: Record<string, string> = {
  ethereum: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Public Infura (no key needed for basics)
  arbitrum: "https://arb1.arbitrum.io/rpc",
  base: "https://mainnet.base.org",
  polygon: "https://polygon-rpc.com",
  matic: "https://polygon-rpc.com",
  bnb: "https://bsc-dataseed.binance.org",
  bsc: "https://bsc-dataseed.binance.org",
};

// Expanded multi-provider fallbacks (prioritize reliable ones)
const EXTRA_FALLBACKS: Record<string, string[]> = {
  ethereum: [
    "https://ethereum.publicnode.com",
    "https://rpc.ankr.com/eth",
    "https://eth.llamarpc.com",
    "https://1rpc.io/eth",
  ],
  arbitrum: [
    "https://arbitrum.publicnode.com",
    "https://rpc.ankr.com/arbitrum",
    "https://arb1.llamarpc.com",
  ],
  base: [
    "https://base.gateway.tenderly.co",
    "https://base.publicnode.com",
    "https://base.llamarpc.com",
  ],
  polygon: [
    "https://polygon-bor.publicnode.com",
    "https://rpc.ankr.com/polygon",
    "https://polygon.llamarpc.com",
  ],
  bsc: [
    "https://bsc.publicnode.com",
    "https://rpc.ankr.com/bsc",
    "https://bsc.llamarpc.com",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NOWNODES_API_KEY;
    const body = await req.json();
    const rpcUrl: string | undefined = body.rpcUrl;
    const chainKey: string | undefined = body.chain;

    // Build candidates
    const candidates: string[] = [];
    if (rpcUrl) candidates.push(rpcUrl);

    if (chainKey) {
      const key = chainKey.toLowerCase();
      if (apiKey && HOSTS[key]) {
        candidates.push(`${HOSTS[key].replace(/\/$/, "")}/${apiKey}`);
      }
      if (PUBLIC_HOSTS[key]) candidates.push(PUBLIC_HOSTS[key]);
      if (Array.isArray(EXTRA_FALLBACKS[key])) candidates.push(...EXTRA_FALLBACKS[key]);
    }

    // Deduplicate
    const seen = new Set<string>();
    const uniqueCandidates = candidates.filter((u) => {
      if (!u) return false;
      const k = u.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (uniqueCandidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing rpcUrl or unsupported chain", supported: Array.from(new Set([...Object.keys(HOSTS), ...Object.keys(PUBLIC_HOSTS)])) }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { jsonrpc, method, params, id } = body;
    if (!jsonrpc || !method || typeof id === "undefined") {
      return new Response(
        JSON.stringify({ error: "Invalid JSON-RPC body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sequential fetch with longer timeout and per-endpoint error logging
    let lastText: string | null = null;
    let lastStatus = 502;
    for (let attempt = 0; attempt < uniqueCandidates.length; attempt++) {
      const targetBase = uniqueCandidates[attempt];
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000); // Increased to 15s

      try {
        const upstream = await fetch(targetBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc, method, params: params ?? [], id }),
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const text = await upstream.text();
        if (upstream.ok) {
          const contentType = upstream.headers.get("content-type") || "application/json";
          return new Response(text, { status: upstream.status, headers: { "Content-Type": contentType } });
        } else {
          lastText = text;
          lastStatus = upstream.status;
          console.error(`RPC fallback ${attempt + 1} failed (${targetBase}): ${upstream.status} - ${text.slice(0, 200)}`);
        }
      } catch (e: any) {
        clearTimeout(timeout);
        console.error(`RPC fallback ${attempt + 1} network error (${targetBase}): ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ error: "All RPC upstreams failed after retries", status: lastStatus, debug: uniqueCandidates.slice(0, 3), body: lastText }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("RPC proxy error:", err);
    return new Response(
      JSON.stringify({ error: "RPC proxy error", details: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}