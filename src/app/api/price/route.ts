import { NextRequest } from "next/server";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // Forward to /simple/price by default
    const endpoint = searchParams.get("endpoint") || "simple/price";

    // Pass through all query params
    const qp = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) {
      if (k === "endpoint") continue;
      qp.set(k, v);
    }

    // sensible defaults if none provided
    if (!qp.get("ids")) qp.set("ids", "ethereum");
    if (!qp.get("vs_currencies")) qp.set("vs_currencies", "usd");

    const url = `${COINGECKO_BASE}/${endpoint}?${qp.toString()}`;

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
      JSON.stringify({ error: "Price proxy error", details: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}