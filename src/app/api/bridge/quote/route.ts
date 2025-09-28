import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map chain names to IDs and USDC addresses
const CHAIN_MAP: Record<string, {id: number, slug: string, usdcAddress: string, rangoSlug: string, nativeSymbol: string}> = {
  ethereum: { id: 1, slug: "ETH", usdcAddress: "0xA0b86991c6218B36c1d19D4a2e9Eb0cE3606eB48", rangoSlug: "ETH", nativeSymbol: "ETH" },
  arbitrum: { id: 42161, slug: "ARB", usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", rangoSlug: "ARBITRUM", nativeSymbol: "ETH" },
  base: { id: 8453, slug: "BASE", usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", rangoSlug: "BASE", nativeSymbol: "ETH" },
  polygon: { id: 137, slug: "MATIC", usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359", rangoSlug: "POLYGON", nativeSymbol: "MATIC" },
  bsc: { id: 56, slug: "BSC", usdcAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", rangoSlug: "BSC", nativeSymbol: "BNB" },
};

// New: Accept common aliases (e.g., "eth" => "ethereum", "matic" => "polygon")
const CHAIN_ALIASES: Record<string, keyof typeof CHAIN_MAP> = {
  eth: "ethereum",
  ether: "ethereum",
  mainnet: "ethereum",
  arbitrum: "arbitrum",
  arb: "arbitrum",
  arbi: "arbitrum",
  base: "base",
  polygon: "polygon",
  matic: "polygon",
  poly: "polygon",
  bsc: "bsc",
  bnb: "bsc",
  binance: "bsc",
  binancesmartchain: "bsc",
};

function normalizeChainKey(input?: string | null): keyof typeof CHAIN_MAP | undefined {
  if (!input) return undefined;
  const k = String(input).toLowerCase();
  // Direct match
  if (k in CHAIN_MAP) return k as keyof typeof CHAIN_MAP;
  // Alias match
  return CHAIN_ALIASES[k];
}

const TOKEN_MAP: Record<string, string> = {
  // Use native token sentinel for native coins in some providers
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  USDC: "", // Resolved per chain below
};

// Provider API key (required): Rango only
const RANGO_API_KEY = process.env.RANGO_API_KEY || process.env.NEXT_PUBLIC_RANGO_API_KEY;

function firstNonEmpty(...vals: Array<string | null | undefined>) {
  for (const v of vals) if (v && v.trim().length) return v;
  return undefined;
}

function extractParams(req: NextRequest) {
  // Layered extraction strategy to be resilient across environments
  // 1) Try req.nextUrl
  let sp: URLSearchParams | null = null;
  try {
    // @ts-expect-error: nextUrl exists on NextRequest
    const nx = (req as any).nextUrl;
    if (nx?.searchParams) sp = nx.searchParams as URLSearchParams;
  } catch {}

  // 2) Try URL(req.url, base from headers)
  if (!sp || sp.size === 0) {
    try {
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const base = `${proto}://${host}`;
      const u = new URL((req as any).url ?? "", base);
      if (u.searchParams) sp = u.searchParams;
    } catch {}
  }

  // 3) Manual parse from raw req.url as a last resort
  if ((!sp || sp.size === 0) && (req as any).url) {
    try {
      const raw: string = (req as any).url;
      const q = raw.includes("?") ? raw.split("?")[1] : "";
      sp = new URLSearchParams(q);
    } catch {}
  }

  // 4) Also allow POST JSON body as fallback
  return sp || new URLSearchParams();
}

async function getBodyParams(req: NextRequest) {
  try {
    if (req.method !== "POST") return {} as any;
    const json = await req.json();
    return json || {};
  } catch {
    return {} as any;
  }
}

function toLowerParamDict(sp: URLSearchParams) {
  const dict: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!dict[k.toLowerCase()]) dict[k.toLowerCase()] = v;
  });
  return dict;
}

// Build Rango asset string like "ETH.ETH" (native) or "BASE.USDC--0x..."
function buildRangoAsset(chainKey: keyof typeof CHAIN_MAP, tokenSymbol: string, tokenAddress: string | null) {
  const cfg = CHAIN_MAP[chainKey];
  const rangoChain = cfg.rangoSlug;

  // Known WETH addresses per chain for non-native ETH representations
  const WETH_ADDR: Partial<Record<keyof typeof CHAIN_MAP, string>> = {
    polygon: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619", // WETH on Polygon
    base: "0x4200000000000000000000000000000000000006",   // WETH on Base
    arbitrum: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // WETH on Arbitrum
    // optimism could be added if needed: 0x4200000000000000000000000000000000000006
  };

  if (tokenSymbol === "USDC") {
    // Rango expects symbol plus address for tokens
    return `${rangoChain}.USDC--${(tokenAddress || "").toLowerCase()}`;
  }

  if (tokenSymbol === "ETH") {
    // If chain native token is ETH, use native representation; otherwise use WETH ERC-20 address
    if (cfg.nativeSymbol === "ETH") {
      return `${rangoChain}.ETH`;
    }
    const weth = WETH_ADDR[chainKey];
    if (weth) {
      return `${rangoChain}.WETH--${weth.toLowerCase()}`;
    }
    // Fallback to provided address sentinel if available
    if (tokenAddress) return `${rangoChain}.ETH--${tokenAddress.toLowerCase()}`;
  }

  // Fallback: if unknown token, try with address form
  if (tokenAddress) return `${rangoChain}.${tokenSymbol}--${tokenAddress.toLowerCase()}`;
  return `${rangoChain}.${tokenSymbol}`;
}

// Helper: Try Rango (only provider)
async function tryRangoQuote(opts: {
  from: string;
  to: string;
  amount: string;
  slippage?: string | number;
}) {
  if (!RANGO_API_KEY) return { ok: false, error: "Rango API key missing" } as const;
  try {
    const qs = new URLSearchParams({ apiKey: RANGO_API_KEY });
    qs.set("from", opts.from);
    qs.set("to", opts.to);
    qs.set("amount", opts.amount);
    if (opts.slippage != null) qs.set("slippage", String(opts.slippage));

    const url = `https://api.rango.exchange/basic/quote?${qs.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*", "x-api-key": RANGO_API_KEY },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false as const, error: `Rango error: ${res.status} ${res.statusText} ${text}` };
    }
    const data = await res.json().catch(() => ({}));
    const hasAny = data && Object.keys(data).length > 0;
    if (!hasAny) return { ok: false as const, error: "Rango returned empty quote" };

    // Prefer a concrete route object if Rango returns a list
    const route = (data?.route) || (Array.isArray(data?.routes) && data.routes[0]) || (data?.bestRoute) || null;

    const normalized = {
      provider: "rango",
      bridge: route?.name || data?.path || data?.provider || "Rango",
      estimatedDuration: (route?.estimatedTimeInSeconds ?? data?.estimatedTimeInSeconds ?? data?.etaSeconds) || null,
      feeCosts: route?.fee ?? data?.fee ?? data?.fees ?? null,
      gasCosts: route?.gas ?? data?.gas ?? null,
      toAmount: route?.outputAmount ?? data?.outputAmount ?? route?.toAmount ?? data?.toAmount ?? null,
      toAmountMin: route?.outputAmountMin ?? route?.minOutputAmount ?? data?.toAmountMin ?? data?.minOutputAmount ?? null,
      slippage: data?.slippage ?? null,
      steps: (route?.steps ?? data?.steps ?? data?.route?.steps ?? []),
    };
    return { ok: true as const, data: normalized, raw: data };
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Rango request timed out" : (e?.message || "Rango network error");
    return { ok: false as const, error: msg };
  }
}

// GET /api/bridge/quote?fromChain=ethereum&toChain=base&fromToken=USDC&toToken=USDC&fromAmount=50000000
// Proxies to Rango and returns a normalized subset
export async function GET(request: NextRequest) {
  // Use robust extractor to handle various hosting environments
  const searchParams = extractParams(request);
  const dict = toLowerParamDict(searchParams);

  const fromChainRaw = firstNonEmpty(
    dict["fromchain"],
    dict["from"],
    searchParams.get("fromChain") || undefined
  );
  const toChainRaw = firstNonEmpty(
    dict["tochain"],
    dict["to"],
    searchParams.get("toChain") || undefined
  );
  const fromToken = firstNonEmpty(
    dict["fromtoken"],
    dict["token"],
    searchParams.get("fromToken") || undefined
  )?.toUpperCase();
  const toToken = firstNonEmpty(
    dict["totoken"],
    dict["to_token"],
    searchParams.get("toToken") || (fromToken as any)
  )?.toUpperCase();
  const fromAmount = firstNonEmpty(
    dict["fromamount"],
    dict["amount"],
    searchParams.get("fromAmount") || undefined
  );

  const fromChain = normalizeChainKey(fromChainRaw);
  const toChain = normalizeChainKey(toChainRaw);

  if (!fromChain || !toChain || !fromToken || !fromAmount) {
    // Debug payload to inspect what's actually received by the server
    const debug = {
      url: (request as any).url,
      search: `?${searchParams.toString()}`,
      entries: Array.from(searchParams.entries()),
      fromChainRaw,
      toChainRaw,
    };
    return NextResponse.json(
      { error: "Missing or invalid params: fromChain, toChain, fromToken, fromAmount", debug },
      { status: 400 }
    );
  }

  const fromChainConfig = CHAIN_MAP[fromChain];
  const toChainConfig = CHAIN_MAP[toChain];
  if (!fromChainConfig || !toChainConfig) {
    return NextResponse.json(
      { error: `Unsupported chain: ${fromChainRaw} or ${toChainRaw}. Supported: ethereum, arbitrum, base, polygon, bsc` },
      { status: 400 }
    );
  }

  let fromTokenAddress = fromToken === "ETH" ? TOKEN_MAP.ETH : 
    (fromToken === "USDC" ? fromChainConfig.usdcAddress : null);
  let toTokenAddress = toToken === "ETH" ? TOKEN_MAP.ETH : 
    (toToken === "USDC" ? toChainConfig.usdcAddress : null);

  if (fromToken === "USDC" && !fromTokenAddress) {
    return NextResponse.json({ error: `USDC address not found for ${fromChain}` }, { status: 400 });
  }
  if (toToken === "USDC" && !toTokenAddress) {
    return NextResponse.json({ error: `USDC address not found for ${toChain}` }, { status: 400 });
  }

  // Rango only
  if (!RANGO_API_KEY) {
    return NextResponse.json({ error: "Rango API key not configured" }, { status: 500 });
  }
  const fromAsset = buildRangoAsset(fromChain, fromToken, fromTokenAddress);
  const toAsset = buildRangoAsset(toChain, toToken, toTokenAddress);
  const rango = await tryRangoQuote({
    from: fromAsset,
    to: toAsset,
    amount: fromAmount,
    slippage: "1.0",
  });
  if (rango.ok) {
    return NextResponse.json({ data: rango.data, raw: rango.raw, references: ["https://api.rango.exchange/"] });
  }
  return NextResponse.json({ error: rango.error || "Rango failed" }, { status: 502 });
}

// Support POST body as an alternative input method
export async function POST(req: NextRequest) {
  const searchParams = extractParams(req);
  const dict = toLowerParamDict(searchParams);
  const body = await getBodyParams(req);

  const fromChainRaw = firstNonEmpty((body?.fromChain || body?.from)?.toLowerCase?.(), dict["fromchain"], dict["from"], searchParams.get("fromChain") || undefined);
  const toChainRaw = firstNonEmpty((body?.toChain || body?.to)?.toLowerCase?.(), dict["tochain"], dict["to"], searchParams.get("toChain") || undefined);
  const fromToken = firstNonEmpty((body?.fromToken || body?.token)?.toUpperCase?.(), dict["fromtoken"], dict["token"], searchParams.get("fromToken") || undefined)?.toUpperCase();
  const toToken = firstNonEmpty((body?.toToken || body?.to_token)?.toUpperCase?.(), dict["totoken"], dict["to_token"], searchParams.get("toToken") || (fromToken as any))?.toUpperCase();
  const fromAmount = firstNonEmpty(body?.fromAmount || body?.amount, dict["fromamount"], dict["amount"], searchParams.get("fromAmount") || undefined);

  const fromChain = normalizeChainKey(fromChainRaw);
  const toChain = normalizeChainKey(toChainRaw);

  if (!fromChain || !toChain || !fromToken || !fromAmount) {
    return NextResponse.json(
      { error: "Missing or invalid params: fromChain, toChain, fromToken, fromAmount" },
      { status: 400 }
    );
  }

  // Reuse GET logic to avoid divergence
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const url = new URL(`${proto}://${host}/api/bridge/quote`);
  url.searchParams.set("fromChain", fromChain);
  url.searchParams.set("toChain", toChain);
  url.searchParams.set("fromToken", fromToken);
  url.searchParams.set("toToken", toToken);
  url.searchParams.set("fromAmount", fromAmount);

  return fetch(url.toString(), { cache: "no-store" });
}