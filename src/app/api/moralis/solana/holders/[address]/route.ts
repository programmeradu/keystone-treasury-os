import { NextRequest, NextResponse } from "next/server";

// GET /api/moralis/solana/holders/[address]?limit=100&cursor=<cursor>
// Note: Despite the path name, this implementation prefers Helius DAS (getAssetsByOwner)
// to fetch a wallet's token/NFT holdings. We keep the path for backward-compatibility.

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    if (!address || address.length < 20) {
      return NextResponse.json({ ok: false, error: "Invalid Solana address" }, { status: 400 });
    }

    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    if (!HELIUS_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "HELIUS_API_KEY not configured. Provide HELIUS_API_KEY to enable Solana portfolio lookup.",
          hint: "Sign up at helius.xyz, then set HELIUS_API_KEY in your environment."
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10), 1), 1000);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const cursor = searchParams.get("cursor") || undefined;

    // Helius DAS: getAssetsByOwner
    // POST https://mainnet.helius-rpc.com/?api-key=... with JSON-RPC method "getAssetsByOwner"
    const endpoint = `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(HELIUS_API_KEY)}`;

    const body = {
      jsonrpc: "2.0",
      id: "keystone-holders",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: address,
        page: cursor ? undefined : page,
        limit,
        cursor,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
          showZeroBalance: false
        }
      }
    } as const;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data) {
      return NextResponse.json(
        { ok: false, error: "Helius DAS request failed", details: data },
        { status: resp.status || 502 }
      );
    }

    // Normalize response
    const result = data?.result || {};
    const items = Array.isArray(result?.items) ? result.items : [];
    return NextResponse.json({
      ok: true,
      source: "helius",
      address,
      page: result?.page ?? page,
      limit,
      cursor: result?.cursor ?? null,
      nativeBalance: result?.nativeBalance ?? null,
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch Solana holdings" }, { status: 500 });
  }
}