import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  if (!address) {
    return NextResponse.json({ error: "Missing token address" }, { status: 400 });
  }

  const apiKey = process.env.MORALIS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "MORALIS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const url = `https://solana-gateway.moralis.io/token/mainnet/holders/${encodeURIComponent(
      address
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": apiKey,
      },
      // Avoid caching to keep stats fresh
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: "Moralis request failed", status: res.status, data },
        { status: res.status }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=15", // tiny cache for bursty calls
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}