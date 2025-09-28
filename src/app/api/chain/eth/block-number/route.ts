import { NextRequest } from "next/server";

export async function GET() {
  const apiKey = process.env.NOWNODES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing NOWNODES_API_KEY in server environment" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`https://eth.nownodes.io/${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 83,
      }),
      // Avoid caching to always get the latest block
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: "NowNodes error", details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err: any) {
    return Response.json(
      { error: "Failed to fetch block number", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Support POST too, identical behavior
  return GET();
}