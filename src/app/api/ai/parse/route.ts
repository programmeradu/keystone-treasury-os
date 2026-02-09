import { NextRequest } from "next/server";

// Solana-native NLP parser for Strategy Lab
// Maps natural language → { action, amount, asset, venue, confidence }
// No external keys required. Deterministic, fast, and safe defaults.

const SOLANA_TOKENS: Record<string, string> = {
  sol: "SOL", msol: "mSOL", stsol: "stSOL", jitosol: "jitoSOL",
  usdc: "USDC", usdt: "USDT",
  jup: "JUP", bonk: "BONK", wif: "WIF", jto: "JTO",
  pyth: "PYTH", orca: "ORCA", ray: "RAY", mnde: "MNDE",
  drift: "DRIFT", tnsr: "TNSR", render: "RENDER", mobile: "MOBILE",
  hnt: "HNT", samo: "SAMO", dust: "DUST", step: "STEP",
};

const VENUES: Record<string, string[]> = {
  jupiter: ["jupiter", "jup.ag", "jup"],
  marinade: ["marinade", "mnde"],
  orca: ["orca", "whirlpool"],
  raydium: ["raydium", "ray"],
  kamino: ["kamino"],
  drift: ["drift"],
  marginfi: ["marginfi", "mrgn"],
  solend: ["solend"],
  sanctum: ["sanctum"],
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { prompt?: string; text?: string };
    const raw = body?.prompt ?? body?.text ?? "";
    if (!raw.trim()) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }

    const original = String(raw);
    const lower = original.toLowerCase().replace(/,/g, "");

    // ── Amount parsing ──────────────────────────────────────────────
    const amtMatch = lower.match(/(\d+(?:\.\d+)?)\s*(k|m|b)?\s*(sol|usdc|usdt|msol|jup|bonk|wif|jto|pyth|orca|ray)?/);
    let amount = amtMatch ? parseFloat(amtMatch[1]) : undefined;
    const mag = amtMatch?.[2]?.toLowerCase();
    if (amount && mag) {
      amount *= mag === "k" ? 1e3 : mag === "m" ? 1e6 : mag === "b" ? 1e9 : 1;
    }

    // ── Token detection ─────────────────────────────────────────────
    let sellToken: string | undefined;
    let buyToken: string | undefined;

    // "swap X SOL to/for USDC" pattern
    const swapPairMatch = lower.match(/(?:swap|convert|exchange)\s+(?:\d+(?:\.\d+)?\s*(?:k|m|b)?\s*)?(\w+)\s+(?:to|for|into)\s+(\w+)/);
    if (swapPairMatch) {
      sellToken = SOLANA_TOKENS[swapPairMatch[1]] || swapPairMatch[1].toUpperCase();
      buyToken = SOLANA_TOKENS[swapPairMatch[2]] || swapPairMatch[2].toUpperCase();
    }

    // General token detection from text
    const detectedTokens: string[] = [];
    for (const [key, sym] of Object.entries(SOLANA_TOKENS)) {
      // Word-boundary match to avoid "solve" matching "sol"
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(lower)) detectedTokens.push(sym);
    }
    if (!sellToken && detectedTokens.length > 0) sellToken = detectedTokens[0];
    if (!buyToken && detectedTokens.length > 1) buyToken = detectedTokens[1];

    // ── Venue detection ─────────────────────────────────────────────
    let venue: string | undefined;
    for (const [name, keywords] of Object.entries(VENUES)) {
      if (keywords.some((k) => lower.includes(k))) { venue = name; break; }
    }

    // ── Slippage ────────────────────────────────────────────────────
    const slipMatch = lower.match(/(\d+(?:\.\d+)?)\s*%?\s*slippage/) || lower.match(/slippage\s*(\d+(?:\.\d+)?)\s*%?/);
    const slippage = slipMatch ? parseFloat(slipMatch[1]) : undefined;

    // ── Action detection ────────────────────────────────────────────
    let action: "stake" | "swap" | "lp" | "dca" | "lend" | "hold" | undefined;

    if (/\b(stake|staking|deposit.*marinade|liquid.?staking)\b/.test(lower)) action = "stake";
    else if (/\b(swap|exchange|convert|trade|buy|sell)\b/.test(lower)) action = "swap";
    else if (/\b(lp|liquidity|pool|provide.?liquidity|add.?liquidity)\b/.test(lower)) action = "lp";
    else if (/\b(dca|dollar.?cost|auto.?buy|recurring)\b/.test(lower)) action = "dca";
    else if (/\b(lend|borrow|supply|deposit)\b/.test(lower)) action = "lend";
    else if (/\b(hold|hodl|keep)\b/.test(lower)) action = "hold";

    // Default: if we have an amount + SOL and no action, assume stake
    if (!action && sellToken === "SOL" && amount) action = "stake";
    // If we still have nothing, default to swap
    if (!action) action = "swap";

    // ── Auto-infer venue if not specified ────────────────────────────
    if (!venue) {
      if (action === "stake") venue = "marinade";
      else if (action === "swap") venue = "jupiter";
      else if (action === "lp") venue = "orca";
      else if (action === "lend") venue = "marginfi";
    }

    // ── Default tokens ──────────────────────────────────────────────
    if (!sellToken) sellToken = "SOL";
    if (action === "swap" && !buyToken) buyToken = sellToken === "SOL" ? "USDC" : "SOL";

    // ── Confidence scoring ──────────────────────────────────────────
    let confidence = 0.4;
    if (action) confidence += 0.2;
    if (amount) confidence += 0.15;
    if (sellToken) confidence += 0.1;
    if (venue) confidence += 0.05;
    if (swapPairMatch) confidence += 0.1;
    confidence = Math.min(0.95, confidence);

    return new Response(
      JSON.stringify({
        ok: true,
        action,
        amount,
        asset: sellToken,
        buyAsset: buyToken,
        venue,
        slippage,
        confidence,
        detectedTokens,
      }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: "Parse error", details: err?.message || String(err) }),
      { status: 500 }
    );
  }
}