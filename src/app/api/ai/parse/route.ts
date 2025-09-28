import { NextRequest } from "next/server";

// Heuristic parser for NL prompts → structured intent and steps
// No external keys required. Deterministic, fast, and safe defaults.
export async function POST(req: NextRequest) {
  try {
    // Accept both { prompt } and { text } payloads for client compatibility
    const body = (await req.json()) as { prompt?: string; text?: string };
    const raw = body?.prompt ?? body?.text ?? "";
    if (!raw.trim()) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), { status: 400 });
    }

    const original = String(raw);
    const lower = original.toLowerCase();

    // Amount parsing: e.g., 100k, 2.5m, 75,000, 1
    const normalized = lower.replace(/,/g, "");
    const amtMatch = normalized.match(/(\d+(?:\.\d+)?)(\s*)(k|m|b)?/);
    let amount = amtMatch ? parseFloat(amtMatch[1]) : undefined;
    const mag = amtMatch?.[3]?.toLowerCase();
    if (amount && mag) {
      const mult = mag === "k" ? 1e3 : mag === "m" ? 1e6 : mag === "b" ? 1e9 : 1;
      amount = amount * mult;
    }

    // Token detection (expanded)
    const tokenMap = ["usdc", "eth", "weth", "dai", "usdt", "wbtc", "btc", "op", "arb", "baseeth"];
    const token = tokenMap.find((t) => lower.includes(t))?.toUpperCase() || undefined;

    // Chain detection
    const chainSynonyms: Record<string, string[]> = {
      ethereum: ["eth", "ethereum", "mainnet"],
      base: ["base"],
      polygon: ["polygon", "matic"],
      arbitrum: ["arbitrum", "arb"],
      optimism: ["optimism", "op"],
      avalanche: ["avalanche", "avax"],
    };

    function detectChain(segment: string): string | undefined {
      const s = segment.toLowerCase();
      for (const [key, vals] of Object.entries(chainSynonyms)) {
        if (vals.some((v) => s.includes(v))) return key;
      }
      return undefined;
    }

    const fromChain = /from\s+([a-z0-9\- ]+)/i.test(original)
      ? detectChain(original.match(/from\s+([a-z0-9\- ]+)/i)! [1])
      : detectChain(original);
    const toChain = /to\s+([a-z0-9\- ]+)/i.test(original)
      ? detectChain(original.match(/to\s+([a-z0-9\- ]+)/i)! [1])
      : undefined;

    // Constraints
    const slippageMatch = lower.match(/(?:<|<=|under|less than)\s*(\d+(?:\.\d+)?)%\s*slippage/) || lower.match(/slippage\s*(\d+(?:\.\d+)?)%/);
    const slippage = slippageMatch ? parseFloat(slippageMatch[1]) : undefined;
    const horizonMatch = lower.match(/(\d+)\s*(day|days|month|months|year|years)/);
    const horizon = horizonMatch ? `${horizonMatch[1]} ${horizonMatch[2]}` : undefined;
    const vestMatch = lower.match(/(\d+)%\s*(?:over|for)\s*(\d+)\s*(months?|years?)/i);
    const vestPercent = vestMatch ? parseFloat(vestMatch[1]) : undefined;
    const vestMonths = vestMatch ? parseInt(vestMatch[2]) * (vestMatch[3].startsWith("year") ? 12 : 1) : undefined;

    // Step detection
    const steps: Array<{ type: string; params?: Record<string, any> }> = [];
    const pushUnique = (type: string, params: Record<string, any> = {}) => {
      if (!steps.find((s) => s.type === type)) steps.push({ type, params });
    };

    if (lower.includes("bridge")) pushUnique("bridge", { amount, token, fromChain, toChain, slippage });
    if (lower.includes("swap")) pushUnique("swap", { amount, sellToken: token, buyToken: token === "ETH" ? "USDC" : "USDC", slippage });
    if (lower.includes("stake") || lower.includes("lend") || lower.includes("deposit")) pushUnique("yield", { asset: token, chain: toChain || fromChain, horizon });
    if (lower.includes("vest")) pushUnique("vest", { percent: vestPercent, months: vestMonths });
    if (lower.includes("gas")) pushUnique("gas", { chain: fromChain || "ethereum" });

    // Default when no obvious action, assume analysis/yield
    if (steps.length === 0) pushUnique("yield", { asset: token || "USDC", chain: toChain || fromChain || "base", horizon: horizon || "30 days" });

    const intent = steps.length > 1 ? "plan" : steps[0].type;

    const confidence = Math.min(0.9, 0.5 + (steps.length > 1 ? 0.2 : 0) + (token ? 0.1 : 0) + (amount ? 0.1 : 0));

    const entities = { amount, token, fromChain, toChain, slippage, horizon, vestPercent, vestMonths };

    const references = [
      { label: "Oracle Docs: Supported Chains", url: "/#showcase" },
      { label: "Gas RPC Example", url: "/api/rpc" },
      { label: "Yields API", url: "/api/yields" },
    ];

    return new Response(
      JSON.stringify({ ok: true, intent, steps, entities, confidence, references }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: "Parse error", details: err?.message || String(err) }),
      { status: 500 }
    );
  }
}