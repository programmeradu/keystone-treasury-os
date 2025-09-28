import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Minimal JSON-RPC proxy for Solana mainnet
// Auto-selects endpoint (public RPC by default; uses Helius when HELIUS_API_KEY is set). No env vars required.
export async function POST(req: Request) {
  try {
    const publicRpc = process.env.NEXT_PUBLIC_SOLANA_RPC;
    const heliusKey = process.env.HELIUS_API_KEY;
    const endpoint = publicRpc || (heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(heliusKey)}` : "https://api.mainnet-beta.solana.com");
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";

    const raw = await req.text();

    // Mock mode: synthesize responses for common methods used by Atlas
    if (mockMode) {
      let body: any = {};
      try { body = JSON.parse(raw || "{}"); } catch {}
      const method = body?.method;
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
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}