import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!address) {
    return NextResponse.json({ error: "Missing token address" }, { status: 400 });
  }

  const apiKey = process.env.MORALIS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MORALIS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Accept query params, fall back to a sane default last-30-days daily series
    const fromDate = searchParams.get("fromDate") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDate = searchParams.get("toDate") || new Date().toISOString();
    const timeFrame = searchParams.get("timeFrame") || "1d"; // 1d, 1h, etc per Moralis docs
    const limit = searchParams.get("limit") || "100";

    const qs = new URLSearchParams({ fromDate, toDate, timeFrame, limit });

    const url = `https://solana-gateway.moralis.io/token/mainnet/holders/${encodeURIComponent(address)}/historical?${qs.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Moralis historical request failed", status: res.status, data },
        { status: res.status }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}