import { NextResponse } from "next/server";

// Lightweight prompt parsers
function extractChain(prompt: string): string | null {
  const p = prompt.toLowerCase();
  const map: Record<string, string> = {
    ethereum: "Ethereum",
    eth: "Ethereum",
    base: "Base",
    arbitrum: "Arbitrum",
    arb: "Arbitrum",
    optimism: "Optimism",
    op: "Optimism",
    polygon: "Polygon",
    matic: "Polygon",
    avalanche: "Avalanche",
    solana: "Solana", // not an EVM chain but supported by DeFiLlama chain TVL
  };
  for (const k of Object.keys(map)) {
    if (p.includes(k)) return map[k];
  }
  // simple pattern: "chain tvl for <name>"
  const m = p.match(/chain\s*tvl\s*(?:for|of)\s*([a-z0-9\- ]{2,})/i);
  if (m?.[1]) return m[1].trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}

function extractProtocol(prompt: string): string | null {
  const p = prompt.toLowerCase();
  // common protocols quick map to DeFiLlama slug casing
  const map: Record<string, string> = {
    uniswap: "uniswap",
    aave: "aave",
    curve: "curve",
    lido: "lido",
    maker: "makerdao",
    makerdao: "makerdao",
    pendle: "pendle",
    radiants: "radiant-capital",
    radiant: "radiant-capital",
    balancer: "balancer",
    sushi: "sushiswap",
    sushiswap: "sushiswap",
  };
  for (const k of Object.keys(map)) {
    if (p.includes(k)) return map[k];
  }
  // pattern: "tvl of <name>" or "tvl for <name>"
  const m = p.match(/tvl\s*(?:of|for)\s*([a-z0-9\- ]{2,})/i);
  if (m?.[1]) return m[1].trim().toLowerCase().replace(/\s+/g, "-");
  return null;
}

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const toolId: string | undefined = body?.toolId;
    const prompt: string = String(body?.prompt || "");
    let chain: string | undefined = body?.chain;
    let protocol: string | undefined = body?.protocol;

    if (toolId !== "defi_chain_tvl" && toolId !== "defi_protocol_tvl") {
      return NextResponse.json({ ok: false, error: "Unsupported tool for DeFiLlama TVL" }, { status: 400 });
    }

    let summary = "";
    let details: any = null;
    let references: Array<{ label: string; url: string }> = [];

    if (toolId === "defi_chain_tvl") {
      chain = chain || extractChain(prompt) || "Base"; // default to Base
      const url = `https://api.llama.fi/v2/historicalChainTvl/${encodeURIComponent(chain)}`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ ok: false, error: `DeFiLlama chain TVL failed: ${res.status} ${text.slice(0, 200)}` }, { status: 502 });
      }
      const data = await res.json();
      // Normalize to expected shape: array with { date, tvl }
      details = Array.isArray(data) ? data.map((p: any) => ({ date: p?.date, tvl: p?.tvl })) : [];
      summary = `Chain TVL for ${chain}`;
      references.push({ label: `DeFiLlama · ${chain}`, url: `https://defillama.com/chain/${encodeURIComponent(chain)}` });
    } else {
      // protocol TVL
      protocol = protocol || extractProtocol(prompt) || "uniswap";
      const url = `https://api.llama.fi/protocol/${encodeURIComponent(protocol)}`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ ok: false, error: `DeFiLlama protocol TVL failed: ${res.status} ${text.slice(0, 200)}` }, { status: 502 });
      }
      const data = await res.json();
      const tvl = Array.isArray(data?.tvl) ? data.tvl : [];
      // Normalize to expected shape: { date, totalLiquidityUSD }
      details = tvl.map((p: any) => ({ date: p?.date, totalLiquidityUSD: p?.totalLiquidityUSD ?? p?.total }));
      const name = data?.name || protocol;
      summary = `Protocol TVL for ${name}`;
      references.push({ label: `DeFiLlama · ${name}`, url: `https://defillama.com/protocol/${encodeURIComponent(protocol)}` });
    }

    const payload = {
      ok: true,
      runId: `defillama-${Math.random().toString(36).slice(2, 10)}`,
      summary,
      details,
      references,
      timings: { durationMs: Date.now() - started },
    };
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}