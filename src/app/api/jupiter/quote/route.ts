import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const inputMint = searchParams.get("inputMint");
  const outputMint = searchParams.get("outputMint");
  const amount = searchParams.get("amount");
  const slippageBps = searchParams.get("slippageBps");
  const dexes = searchParams.get("dexes"); // Restrict route to specific DEX(es)
  const excludeDexes = searchParams.get("excludeDexes");
  const onlyDirectRoutes = searchParams.get("onlyDirectRoutes");

  if (!inputMint || !outputMint || !amount) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const jupUrl = new URL("https://lite-api.jup.ag/swap/v1/quote");
    jupUrl.searchParams.set("inputMint", inputMint);
    jupUrl.searchParams.set("outputMint", outputMint);
    jupUrl.searchParams.set("amount", amount);
    jupUrl.searchParams.set("slippageBps", slippageBps || "50");
    if (dexes) jupUrl.searchParams.set("dexes", dexes);
    if (excludeDexes) jupUrl.searchParams.set("excludeDexes", excludeDexes);
    if (onlyDirectRoutes) jupUrl.searchParams.set("onlyDirectRoutes", onlyDirectRoutes);

    const response = await fetch(jupUrl.toString());

    if (!response.ok) {
      throw new Error(`Jupiter External API Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch quote", details: error.message }, { status: 500 });
  }
}