import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { address: string } }
) {
  const address = params.address;
  if (!address) {
    return NextResponse.json({ error: "Missing token address" }, { status: 400 });
  }

  const apiKey = process.env.MORALIS_API_KEY;
  const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";

  // Mock mode: return deterministic holder stats when no API key is provided
  if (mockMode && !apiKey) {
    const mock = {
      address,
      holders: 12345,
      topHoldersSample: [
        { address: "MockHolder1111111111111111111111111111111", balance: 1_000_000, percent: 5.1 },
        { address: "MockHolder2222222222222222222222222222222", balance: 750_000, percent: 3.2 },
      ],
      updatedAt: Date.now(),
      note: "MOCK_MODE: synthetic Moralis holder stats",
    };
    return NextResponse.json(mock, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

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