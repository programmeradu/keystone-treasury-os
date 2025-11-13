import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Proxy to Helius DAS getTokenAccounts
// Docs: https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api/gettokenaccounts
export async function GET(req: NextRequest) {
  const apiKey = process.env.HELIUS_API_KEY;

  const { searchParams } = new URL(req.url);
  const mint = searchParams.get("mint");
  const owner = searchParams.get("owner"); // optional: filter by owner
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Number(searchParams.get("limit") || 100);

  if (!mint) {
    return new Response(JSON.stringify({ error: "mint is required" }), { status: 400 });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing HELIUS_API_KEY" }), { status: 500 });
  }

  try {
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    const body: any = {
      jsonrpc: "2.0",
      id: "atlas-das-getTokenAccounts",
      method: "getTokenAccounts",
      params: {
        mint,
        owner: owner || undefined,
        cursor,
        page: cursor ? undefined : 1,
        limit,
      },
    };

    const res = await fetch(heliusUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // DAS is real-time; do not cache
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok || data?.error) {
      const msg = data?.error?.message || "Helius DAS request failed";
      return new Response(JSON.stringify({ error: msg }), { status: res.status || 502 });
    }

    // Shape: { total, limit, cursor, token_accounts: [...] }
    return new Response(JSON.stringify(data?.result || data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // small private cache
        "Cache-Control": "private, max-age=15",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
}