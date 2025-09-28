import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper: hex <-> number (wei) and gwei conversions
function hexToNumber(hex: string | null | undefined): number {
  if (!hex) return 0;
  try {
    return parseInt(hex as string, 16);
  } catch {
    return 0;
  }
}
function numberToHex(n: number): string { return `0x${Math.max(0, Math.floor(n)).toString(16)}`; }
function weiToGwei(nWei: number): number { return nWei / 1e9; }
function gweiToWei(nGwei: number): number { return Math.floor(nGwei * 1e9); }

// Public RPC candidates (kept in module scope so GET/POST share)
const PUBLIC_HOSTS: Record<string, string> = {
  ethereum: "https://ethereum.publicnode.com",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  base: "https://base.publicnode.com",
  polygon: "https://polygon-rpc.com",
  optimism: "https://mainnet.optimism.io",
};
const EXTRA_FALLBACKS: Record<string, string[]> = {
  ethereum: ["https://eth.llamarpc.com", "https://1rpc.io/eth", "https://rpc.ankr.com/eth"],
  arbitrum: ["https://arbitrum.publicnode.com", "https://arb1.llamarpc.com", "https://rpc.ankr.com/arbitrum"],
  base: ["https://mainnet.base.org", "https://base.llamarpc.com"],
  polygon: ["https://polygon-bor.publicnode.com", "https://polygon.llamarpc.com", "https://rpc.ankr.com/polygon"],
  optimism: ["https://optimism.publicnode.com", "https://rpc.ankr.com/optimism"],
};

async function rpcUpstream(chain: string, method: string, params: any[] = []) {
  const key = (chain || "").toLowerCase();
  const candidates: string[] = [];
  if (PUBLIC_HOSTS[key]) candidates.push(PUBLIC_HOSTS[key]);
  if (Array.isArray(EXTRA_FALLBACKS[key])) candidates.push(...EXTRA_FALLBACKS[key]);
  if (candidates.length === 0) throw new Error(`Unsupported chain: ${chain}`);

  let lastErr: any;
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      if (!res.ok) { lastErr = new Error(`Upstream ${url} ${res.status}: ${text.slice(0, 200)}`); continue; }
      try {
        const j = JSON.parse(text);
        if (j.error) { lastErr = new Error(j.error?.message || "RPC error"); continue; }
        return j.result;
      } catch (e) {
        lastErr = e;
        continue;
      }
    } catch (e) {
      clearTimeout(timeout);
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error("All RPC upstreams failed");
}

async function runEstimate(chain: string, blocks: number, percentiles: number[]) {
  // 1) Pull recent fee history with percentile rewards
  const feeHistory = await rpcUpstream(chain, "eth_feeHistory", [
    numberToHex(blocks),
    "latest",
    percentiles,
  ]);

  const baseFeePerGas: string[] = feeHistory?.baseFeePerGas || [];
  const reward: string[][][] | string[][] = feeHistory?.reward || [];
  const oldestBlockHex: string = feeHistory?.oldestBlock || "0x0";

  if (!Array.isArray(baseFeePerGas) || baseFeePerGas.length === 0) {
    return { status: 502, body: { ok: false, error: "feeHistory returned no data" } } as const;
  }

  // Use last base fee as current block base fee
  const lastBaseWei = hexToNumber(baseFeePerGas[baseFeePerGas.length - 1]);
  const lastBaseGwei = weiToGwei(lastBaseWei);

  // Extract percentile rewards from last block where available
  // reward is [blocks][percentiles] -> hex wei
  let p10 = 1.5; let p50 = 2.0; let p90 = 3.0; // sensible defaults (gwei)
  try {
    if (Array.isArray(reward) && reward.length > 0) {
      const last = (reward as any)[reward.length - 1];
      if (Array.isArray(last)) {
        if (last[0]) p10 = Math.max(0.1, weiToGwei(hexToNumber(last[0] as any)));
        if (last[1]) p50 = Math.max(0.1, weiToGwei(hexToNumber(last[1] as any)));
        if (last[2]) p90 = Math.max(0.1, weiToGwei(hexToNumber(last[2] as any)));
      }
    } else {
      // Fallback to maxPriorityFeePerGas if no rewards
      const maxPrioHex = await rpcUpstream(chain, "eth_maxPriorityFeePerGas", []);
      const prioGwei = weiToGwei(hexToNumber(maxPrioHex));
      p10 = Math.max(0.1, prioGwei * 0.75);
      p50 = Math.max(0.1, prioGwei);
      p90 = Math.max(0.1, prioGwei * 1.25);
    }
  } catch {
    // Ignore reward parsing errors, keep defaults
  }

  // Heuristic multipliers for maxFee (accounts for base fee spikes)
  const mLow = 1.5; // conservative
  const mStd = 2.0; // standard
  const mFast = 2.5; // fast/urgent

  const safeLow = {
    maxPriorityFeePerGas: p10,
    maxFeePerGas: lastBaseGwei * mLow + p10,
  };
  const standard = {
    maxPriorityFeePerGas: p50,
    maxFeePerGas: lastBaseGwei * mStd + p50,
  };
  const fast = {
    maxPriorityFeePerGas: p90,
    maxFeePerGas: lastBaseGwei * mFast + p90,
  };

  // Best-effort block time estimate using latest and N blocks behind
  let blockTimeSec: number | null = null;
  try {
    const latest = await rpcUpstream(chain, "eth_getBlockByNumber", ["latest", false]);
    const nBehind = Math.max(1, Math.min(100, blocks));
    const behind = await rpcUpstream(chain, "eth_getBlockByNumber", [
      `0x${(parseInt(latest.number, 16) - nBehind).toString(16)}`,
      false,
    ]);
    const tLatest = hexToNumber(latest.timestamp);
    const tBehind = hexToNumber(behind.timestamp);
    const diff = tLatest - tBehind;
    if (diff > 0) blockTimeSec = diff / Math.max(1, Math.min(100, blocks));
  } catch {
    blockTimeSec = null;
  }

  const result = {
    ok: true,
    chain,
    base: {
      baseFeePerGas: lastBaseGwei,
      baseFeePerGasWeiHex: numberToHex(lastBaseWei),
    },
    speeds: {
      safeLow: {
        maxPriorityFeePerGas: Number(safeLow.maxPriorityFeePerGas.toFixed(3)),
        maxFeePerGas: Number(safeLow.maxFeePerGas.toFixed(3)),
        maxPriorityFeePerGasWeiHex: numberToHex(gweiToWei(safeLow.maxPriorityFeePerGas)),
        maxFeePerGasWeiHex: numberToHex(gweiToWei(safeLow.maxFeePerGas)),
      },
      standard: {
        maxPriorityFeePerGas: Number(standard.maxPriorityFeePerGas.toFixed(3)),
        maxFeePerGas: Number(standard.maxFeePerGas.toFixed(3)),
        maxPriorityFeePerGasWeiHex: numberToHex(gweiToWei(standard.maxPriorityFeePerGas)),
        maxFeePerGasWeiHex: numberToHex(gweiToWei(standard.maxFeePerGas)),
      },
      fast: {
        maxPriorityFeePerGas: Number(fast.maxPriorityFeePerGas.toFixed(3)),
        maxFeePerGas: Number(fast.maxFeePerGas.toFixed(3)),
        maxPriorityFeePerGasWeiHex: numberToHex(gweiToWei(fast.maxPriorityFeePerGas)),
        maxFeePerGasWeiHex: numberToHex(gweiToWei(fast.maxFeePerGas)),
      },
    },
    meta: {
      blocks,
      percentiles,
      oldestBlock: oldestBlockHex,
      blockTimeSec,
    },
    summary: `Base fee ~${lastBaseGwei.toFixed(2)} gwei · Safe ${safeLow.maxFeePerGas.toFixed(2)} · Std ${standard.maxFeePerGas.toFixed(2)} · Fast ${fast.maxFeePerGas.toFixed(2)} gwei`,
    references: [
      { label: "EIP-1559", url: "https://eips.ethereum.org/EIPS/eip-1559" },
      { label: "eth_feeHistory", url: "https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_feehistory" },
    ],
  };

  return { status: 200, body: result } as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const chain: string = (body.chain || body.network || "base").toString();
    const blocks: number = Math.max(4, Math.min(50, Number(body.blocks) || 12));
    const percentiles: number[] = Array.isArray(body.percentiles) && body.percentiles.length
      ? body.percentiles.map((p: any) => Number(p)).filter((p: any) => Number.isFinite(p) && p >= 0 && p <= 100)
      : [10, 50, 90];

    const { status, body: resp } = await runEstimate(chain, blocks, percentiles);
    return new Response(JSON.stringify(resp), { status, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chain = (searchParams.get("chain") || "base").toString();
    const blocks = Math.max(4, Math.min(50, Number(searchParams.get("blocks") || 12)));
    const percentilesParam = searchParams.getAll("p"); // allow multiple p=10&p=50&p=90
    const percentiles = percentilesParam.length
      ? percentilesParam.map((p) => Number(p)).filter((p) => Number.isFinite(p) && p >= 0 && p <= 100)
      : [10, 50, 90];

    const { status, body } = await runEstimate(chain, blocks, percentiles);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}