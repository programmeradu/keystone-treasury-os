import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deterministic, provider-agnostic quote normalizer for MVP
// Accepts POST with either:
// - { type: "bridge" | "swap", fromChain, toChain, fromToken, toToken, fromAmount }
// - { prompt: string }  // will infer fields naively
// Returns a normalized shape compatible with HomeClient's expectations

function inferFromPrompt(prompt: string) {
  const t = prompt.toLowerCase();
  const hasBridge = /bridge|across|send.*to\s+(base|polygon|arbitrum|ethereum|bsc)/i.test(t);
  const chains = ["ethereum", "arbitrum", "base", "polygon", "bsc"] as const;
  const tokens = ["USDC", "ETH"] as const;

  const toChain = chains.find((c) => new RegExp(c, "i").test(t)) || (hasBridge ? "base" : "ethereum");
  const fromChain = hasBridge ? (/(arbitrum|ethereum|base|polygon|bsc)/i.exec(t)?.[1]?.toLowerCase() || "ethereum") : "ethereum";
  const fromToken = /usdc/i.test(t) ? "USDC" : "ETH";
  const toToken = fromToken === "USDC" ? "ETH" : "USDC";
  const amountMatch = t.match(/(\d+[.,]?\d*)\s*(k|m)?/i);
  const baseAmt = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 100;
  const scale = amountMatch?.[2]?.toLowerCase() === "m" ? 1_000_000 : amountMatch?.[2]?.toLowerCase() === "k" ? 1_000 : 1;
  const notional = Math.max(1, Math.round(baseAmt * scale));

  return {
    type: hasBridge ? "bridge" : "swap",
    fromChain,
    toChain,
    fromToken,
    toToken,
    fromAmount: String(fromToken === "USDC" ? notional * 1_000_000 : BigInt(notional) * BigInt("1000000000000000000")),
    notional,
  } as const;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const inferred = body?.prompt ? inferFromPrompt(String(body.prompt || "")) : null;

  const type = (body?.type || inferred?.type || "swap") as "bridge" | "swap" | "stake";
  const fromChain = String(body?.fromChain || inferred?.fromChain || "ethereum").toLowerCase();
  const toChain = String(body?.toChain || inferred?.toChain || (type === "bridge" ? "base" : "ethereum")).toLowerCase();
  const fromToken = String(body?.fromToken || inferred?.fromToken || "USDC").toUpperCase();
  const toToken = String(body?.toToken || inferred?.toToken || (fromToken === "USDC" ? "ETH" : "USDC")).toUpperCase();
  const fromAmount = String(body?.fromAmount || inferred?.fromAmount || "100000000");

  // Deterministic pseudo-pricing for demo purposes
  const price = fromToken === "USDC" && toToken === "ETH" ? 1 / 3200 : fromToken === "ETH" && toToken === "USDC" ? 3200 : 1;
  const toAmount = (() => {
    try {
      const big = BigInt(fromAmount);
      // If USDC (6 decimals) -> ETH (18 decimals), scale to get rough notional conversion
      if (fromToken === "USDC" && toToken === "ETH") {
        // Convert to float-like using Number for demo; safe for MVP scale only
        const usdc = Number(big) / 1_000_000;
        const eth = usdc * price; // price is 1/3200 => ~0.0003125 per USDC
        return Math.max(1, Math.floor(eth * 1e18));
      }
      if (fromToken === "ETH" && toToken === "USDC") {
        const eth = Number(big) / 1e18;
        const usdc = eth * price; // 3200
        return Math.max(1, Math.floor(usdc * 1_000_000));
      }
      return Number(big);
    } catch {
      return 0;
    }
  })();

  const etaSeconds = type === "bridge" ? 15 * 60 : 30; // 15 min bridge, 30s swap
  const savings = type === "bridge" ? { amount: "$8.42", percent: 3.1 } : { amount: "$1.12", percent: 0.4 };

  const data = {
    provider: type === "bridge" ? "unified-bridge" : "unified-swap",
    bridge: type === "bridge" ? "Keystone Det. Bridge" : undefined,
    estimatedDuration: etaSeconds,
    toAmount,
    toAmountMin: Math.floor(toAmount * 0.997),
    slippage: 0.3,
    price: price,
    savings,
    nextBest: type === "bridge" ? { bridge: "AltBridge", toAmount: Math.floor(toAmount * 0.992) } : undefined,
    steps: [
      { title: type === "bridge" ? "Bridge" : "Swap", fromChain, toChain, fromToken, toToken },
      { title: "Confirm", policy: "slippage<=0.5%" },
    ],
  };

  return NextResponse.json({ data, references: ["/api/quotes"], debug: { type, fromChain, toChain, fromToken, toToken } });
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  // Allow quick tests via query params
  const prompt = u.searchParams.get("prompt") || "";
  return POST(new NextRequest(req.url, { method: "POST", body: JSON.stringify({ prompt }) } as any));
}