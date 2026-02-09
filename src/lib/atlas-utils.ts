/**
 * Shared utilities for Solana Atlas tools
 */

/**
 * Validate a Solana Base58 address (32-44 chars, no 0/O/I/l)
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/**
 * Format a number as USD currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format SOL amount with 6 decimal places
 */
export function formatSOL(value: number): string {
  return `${value.toFixed(6)} SOL`;
}

/**
 * Format percent with +/- sign
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/**
 * Fetch token prices from Jupiter price proxy by mint addresses.
 * Returns a map of mint → price (USD).
 */
export async function fetchTokenPrices(mints: string[]): Promise<Record<string, number>> {
  if (!mints.length) return {};
  try {
    const res = await fetch(`/api/jupiter/price?mints=${encodeURIComponent(mints.join(","))}`, { cache: "no-store" });
    if (!res.ok) return {};
    const data = await res.json();
    const priceData = data?.data || {};
    const result: Record<string, number> = {};
    for (const mint of mints) {
      const p = Number(priceData[mint]?.price ?? NaN);
      if (Number.isFinite(p)) result[mint] = p;
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Percent change from first to last element of a number array
 */
export function pctChange(arr: number[]): number | null {
  if (!arr || arr.length < 2) return null;
  const first = arr[0];
  const last = arr[arr.length - 1];
  if (!first) return null;
  return (last - first) / first * 100;
}

/**
 * Lightweight retry/backoff fetch helper (JSON)
 */
export async function fetchJsonWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3,
  baseDelayMs = 400
): Promise<any> {
  let lastErr: any = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(input, init);
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : await res.text();
      if (!res.ok) {
        lastErr = new Error((data as any)?.error || res.statusText || "Request failed");
      } else {
        return data;
      }
    } catch (e) {
      lastErr = e;
    }
    const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 200);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastErr;
}
