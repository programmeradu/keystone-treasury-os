import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// In-memory throttle to respect Lite plan fixed 1 RPS
let lastRequestAt = 0;

// Proxy to Jupiter Swap Quote API (Lite plan)
// Docs: https://dev.jup.ag/docs/swap-api/get-quote
export async function GET(req: NextRequest) {
  try {
    // Basic 1 RPS throttle
    const now = Date.now();
    if (now - lastRequestAt < 1000) {
      return NextResponse.json(
        { error: "Rate limited: Lite endpoint allows 1 request per second" },
        { status: 429 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const inputMint = searchParams.get("inputMint");
    const outputMint = searchParams.get("outputMint");
    const amount = searchParams.get("amount"); // amount in smallest units
    const slippageBps = searchParams.get("slippageBps") || "50"; // default 0.5%

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: "Missing required params: inputMint, outputMint, amount" },
        { status: 400 }
      );
    }

    // Mock mode: fabricate a deterministic quote for CI/testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      const inAmt = Number(amount) || 0;
      const outAmount = Math.floor(inAmt * 15); // pretend SOL->USDC at ~$0.000015 lamports ratio
      const data = {
        inputMint,
        outputMint,
        inAmount: amount,
        data: {
          outAmount,
          slippageBps: Number(slippageBps),
          priceImpactPct: 0.0005,
          routePlan: [
            {
              swapInfo: {
                ammKey: "MockAMM111111111111111111111111111111111",
                label: "MockAMM",
              },
            },
          ],
        },
      } as any;
      lastRequestAt = now;
      return NextResponse.json(data, { status: 200 });
    }

    // Lite endpoint (no API key, 1 RPS)
    const u = new URL("https://lite-api.jup.ag/swap/v1/quote");
    u.searchParams.set("inputMint", inputMint);
    u.searchParams.set("outputMint", outputMint);
    u.searchParams.set("amount", amount);
    u.searchParams.set("slippageBps", slippageBps);
    u.searchParams.set("onlyDirectRoutes", "false");

    // Attach Jupiter App ID header if provided via env
    const JUP_APP_ID = process.env.JUPITER_APP_ID || process.env.NEXT_PUBLIC_JUPITER_APP_ID;
    const headers: HeadersInit | undefined = JUP_APP_ID ? { "x-application-id": JUP_APP_ID } : undefined;

    const res = await fetch(u.toString(), { next: { revalidate: 0 }, headers });
    const data = await res.json();

    // Mark last successful attempt (or request) to enforce 1 RPS
    lastRequestAt = now;

    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}