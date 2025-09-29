import { NextRequest, NextResponse } from "next/server";

// GET /api/helius/addresses/[address]/transactions?limit=100&before=<signature>&until=<signature>&startTime=<unix>&endTime=<unix>&page=<n>
// Proxies to Helius Parsed Transaction History API:
//   https://api.helius.xyz/v0/addresses/{address}/transactions?api-key=...&limit=...&before=...&until=...&startTime=...&endTime=...&page=...
// Notes:
// - Requires HELIUS_API_KEY in server env
// - Supports optional network param (?network=mainnet|devnet). Defaults to mainnet.
// - Returns { ok, address, network, params, items, page, cursor? } shape

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    if (!address || address.length < 20) {
      return NextResponse.json({ ok: false, error: "Invalid Solana address" }, { status: 400 });
    }

    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    if (!HELIUS_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "HELIUS_API_KEY not configured. Set HELIUS_API_KEY in your environment." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const network = (searchParams.get("network") || "mainnet").toLowerCase();
    const base = network === "devnet" ? "https://api-devnet.helius.xyz" : "https://api.helius.xyz";

    const qp = new URLSearchParams();
    qp.set("api-key", HELIUS_API_KEY);

    // Supported filters
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10) || 100, 1), 1000);
    qp.set("limit", String(limit));

    const page = parseInt(searchParams.get("page") || "0", 10);
    if (!Number.isNaN(page) && page > 0) qp.set("page", String(page));

    const before = searchParams.get("before");
    if (before) qp.set("before", before);

    const until = searchParams.get("until");
    if (until) qp.set("until", until);

    const startTime = searchParams.get("startTime"); // unix seconds
    if (startTime && /^\d+$/.test(startTime)) qp.set("startTime", startTime);

    const endTime = searchParams.get("endTime"); // unix seconds
    if (endTime && /^\d+$/.test(endTime)) qp.set("endTime", endTime);

    const url = `${base}/v0/addresses/${encodeURIComponent(address)}/transactions?${qp.toString()}`;

    const resp = await fetch(url, { method: "GET", cache: "no-store" });
    const data = await resp.json().catch(() => null);

    if (!resp.ok || !data) {
      return NextResponse.json(
        { ok: false, error: "Helius history request failed", details: data },
        { status: resp.status || 502 }
      );
    }

    // Helius returns an array of parsed tx entries
    const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

    return NextResponse.json({
      ok: true,
      source: "helius",
      network,
      address,
      params: {
        limit,
        page: Number.isNaN(page) ? 0 : page,
        before: before || null,
        until: until || null,
        startTime: startTime ? Number(startTime) : null,
        endTime: endTime ? Number(endTime) : null,
      },
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch parsed tx history" }, { status: 500 });
  }
}