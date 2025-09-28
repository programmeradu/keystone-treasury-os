import { NextRequest } from "next/server";

// Proxies to Jupiter v6 swap build endpoint to construct a signed-by-program transaction
// Docs: https://station.jup.ag/docs/apis/swap-api
const JUP_SWAP_URL = "https://quote-api.jup.ag/v6/swap";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Expect: { quoteResponse, userPublicKey, wrapAndUnwrapSol?, asLegacyTransaction? }
    if (!body?.quoteResponse || !body?.userPublicKey) {
      return new Response(
        JSON.stringify({ error: "Missing quoteResponse or userPublicKey" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const upstream = await fetch(JUP_SWAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: body.quoteResponse,
        userPublicKey: body.userPublicKey,
        wrapAndUnwrapSol: body.wrapAndUnwrapSol ?? true,
        asLegacyTransaction: body.asLegacyTransaction ?? false,
        // Optional: prioritization fee
        // computeUnitPriceMicroLamports: body.computeUnitPriceMicroLamports,
      }),
      cache: "no-store",
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";
    return new Response(text, { status: upstream.status, headers: { "Content-Type": contentType } });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Jupiter swap proxy error", details: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}