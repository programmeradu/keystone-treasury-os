import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal per-chain symbol -> address map (use addresses whenever possible)
const TOKEN_MAP: Record<number, Record<string, string>> = {
  1: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  8453: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6EDb6E08f4c7C32D4f71b54bdA02913",
    USDbC: "0x04bED0aE5cA4ab50C0E07eE1f5F1D3fE1fBdb1b2",
  },
  42161: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  },
  10: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
  },
  137: {
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  },
};

function resolveTokenAddress(chainId: number, token: string): string {
  if (!token) return token;
  if (/^0x[a-fA-F0-9]{40}$/.test(token)) return token;
  const up = token.toUpperCase();
  const map = TOKEN_MAP[chainId] || {};
  // Gasless (Permit2) expects ERC-20 addresses; map native ETH to WETH address
  if (up === "ETH") return (map as any).WETH || token;
  return (map as any)[up] || token;
}

function normalizeV2Price(z: any, sellAmount: string) {
  return {
    provider: "0x",
    price: z?.price ? Number(z.price) : null,
    grossBuyAmount: z?.buyAmount ? String(z.buyAmount) : null,
    grossSellAmount: z?.sellAmount ? String(z.sellAmount) : String(sellAmount),
    estimatedGas: z?.gas ? Number(z.gas) : null,
    gasPrice: z?.gasPrice ?? null,
    allowanceTarget: z?.allowanceTarget ?? null,
    to: z?.transaction?.to ?? null,
    data: z?.transaction?.data ?? null,
    sources: z?.sources || [],
    buyTokenAddress: z?.buyToken || null,
    sellTokenAddress: z?.sellToken || null,
    fees: z?.fees || null,
    blockNumber: z?.blockNumber || null,
    approval: z?.approval || null,
    issues: z?.issues || null,
  };
}

// GET: /api/swap/permit2/price?sellToken=...&buyToken=...&sellAmount=...&chainId=...
export async function GET(req: NextRequest) {
  const base = `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const url = new URL(req.url, base);
  const sp = url.searchParams;
  const rawSellToken = sp.get("sellToken");
  const rawBuyToken = sp.get("buyToken");
  const sellAmount = sp.get("sellAmount");
  const chainId = Number(sp.get("chainId") || 1);

  if (!rawSellToken || !rawBuyToken || !sellAmount) {
    return NextResponse.json({ error: "Missing required params: sellToken, buyToken, sellAmount" }, { status: 400 });
  }

  const sellToken = resolveTokenAddress(chainId, rawSellToken);
  const buyToken = resolveTokenAddress(chainId, rawBuyToken);

  // Optional pass-through params supported by 0x v2
  const taker = sp.get("taker");
  const recipient = sp.get("recipient");
  const slippageBps = sp.get("slippageBps");
  const swapFeeRecipient = sp.get("swapFeeRecipient");
  const swapFeeBps = sp.get("swapFeeBps");
  const swapFeeToken = sp.get("swapFeeToken");

  const qs = new URLSearchParams({
    chainId: String(chainId),
    buyToken,
    sellToken,
    sellAmount,
  });
  if (taker) qs.set("taker", taker);
  if (recipient) qs.set("recipient", recipient);
  if (slippageBps) qs.set("slippageBps", slippageBps);
  if (swapFeeRecipient) qs.set("swapFeeRecipient", swapFeeRecipient);
  if (swapFeeBps) qs.set("swapFeeBps", swapFeeBps);
  if (swapFeeToken) qs.set("swapFeeToken", swapFeeToken);

  const endpoint = `https://api.0x.org/swap/permit2/price?${qs.toString()}`;
  const apiKey = process.env.ZERO_EX_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ZERO_EX_API_KEY not set on server" }, { status: 500 });

  try {
    const zr = await fetch(endpoint, {
      headers: { "0x-api-key": apiKey, "0x-version": "v2" },
      next: { revalidate: 0 },
    });
    if (!zr.ok) {
      let txt = await zr.text().catch(() => zr.statusText);
      if (txt && txt.length > 300) txt = txt.slice(0, 300) + "…";
      return NextResponse.json({ error: `0x v2 (permit2) error ${zr.status}: ${txt}` }, { status: 502 });
    }
    const z = await zr.json();
    const normalized = normalizeV2Price(z, String(sellAmount));
    return NextResponse.json({ data: normalized });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch 0x price" }, { status: 502 });
  }
}

// POST mirrors GET but reads JSON body
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const rawSellToken = body.sellToken as string | undefined;
    const rawBuyToken = body.buyToken as string | undefined;
    const sellAmount = body.sellAmount as string | number | undefined;
    const chainId = Number(body.chainId || 1);

    if (!rawSellToken || !rawBuyToken || (!sellAmount && sellAmount !== 0)) {
      return NextResponse.json({ error: "Missing required body: sellToken, buyToken, sellAmount" }, { status: 400 });
    }

    const sellToken = resolveTokenAddress(chainId, rawSellToken);
    const buyToken = resolveTokenAddress(chainId, rawBuyToken);

    const qs = new URLSearchParams({
      chainId: String(chainId),
      buyToken,
      sellToken,
      sellAmount: String(sellAmount),
    });
    if (body.taker) qs.set("taker", String(body.taker));
    if (body.recipient) qs.set("recipient", String(body.recipient));
    if (body.slippageBps != null) qs.set("slippageBps", String(body.slippageBps));
    if (body.swapFeeRecipient) qs.set("swapFeeRecipient", String(body.swapFeeRecipient));
    if (body.swapFeeBps != null) qs.set("swapFeeBps", String(body.swapFeeBps));
    if (body.swapFeeToken) qs.set("swapFeeToken", String(body.swapFeeToken));

    const endpoint = `https://api.0x.org/swap/permit2/price?${qs.toString()}`;
    const apiKey = process.env.ZERO_EX_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ZERO_EX_API_KEY not set on server" }, { status: 500 });

    const zr = await fetch(endpoint, { headers: { "0x-api-key": apiKey, "0x-version": "v2" }, next: { revalidate: 0 } });
    if (!zr.ok) {
      let txt = await zr.text().catch(() => zr.statusText);
      if (txt && txt.length > 300) txt = txt.slice(0, 300) + "…";
      return NextResponse.json({ error: `0x v2 (permit2) error ${zr.status}: ${txt}` }, { status: 502 });
    }
    const z = await zr.json();
    const normalized = normalizeV2Price(z, String(sellAmount));
    return NextResponse.json({ data: normalized });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bad Request" }, { status: 400 });
  }
}