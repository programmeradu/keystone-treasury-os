import { NextResponse } from "next/server";
import { YIELD_MINTS, type YieldTokenMeta } from "@/lib/yield-registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/yield/rates
 *
 * Returns live APY rates for all known yield-bearing tokens.
 * Fetches from multiple sources in order of reliability:
 *   1. Marinade public API (for mSOL)
 *   2. Sanctum Extra API (for all LSTs) — may be deprecated
 *   3. Conservative fallback estimates from the registry
 *
 * Response shape:
 * {
 *   rates: Record<mint, { apy: number; source: "live" | "estimated"; protocol: string; symbol: string }>,
 *   fetchedAt: string (ISO timestamp)
 * }
 */

// ─── In-memory cache (5 min TTL) ──────────────────────────────────
let cachedRates: Record<string, { apy: number; source: "live" | "estimated"; protocol: string; symbol: string }> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        const now = Date.now();

        // Return cached if fresh
        if (cachedRates && (now - cacheTimestamp) < CACHE_TTL_MS) {
            return NextResponse.json({
                rates: cachedRates,
                fetchedAt: new Date(cacheTimestamp).toISOString(),
                cached: true,
            });
        }

        // Start with fallback values from the registry
        const rates: Record<string, { apy: number; source: "live" | "estimated"; protocol: string; symbol: string }> = {};
        for (const [mint, meta] of Object.entries(YIELD_MINTS)) {
            rates[mint] = {
                apy: meta.fallbackApy,
                source: "estimated",
                protocol: meta.protocol,
                symbol: meta.symbol,
            };
        }

        // ─── Source 1: Marinade public API (mSOL) ──────────────────
        const msolMint = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
        try {
            const marinadeRes = await fetch("https://api.marinade.finance/msol/apy/30d", {
                signal: AbortSignal.timeout(5000),
            });
            if (marinadeRes.ok) {
                const data = await marinadeRes.json();
                // Marinade returns { value: 0.061 } (i.e. 6.1%)
                if (typeof data?.value === "number") {
                    rates[msolMint] = {
                        apy: parseFloat((data.value * 100).toFixed(2)),
                        source: "live",
                        protocol: "Marinade",
                        symbol: "mSOL",
                    };
                }
            }
        } catch {
            // Fallback is already set
        }

        // ─── Source 2: Sanctum Extra API (may be deprecated) ───────
        try {
            const sanctumMints = Object.keys(YIELD_MINTS).join(",");
            const sanctumRes = await fetch(
                `https://extra-api.sanctum.so/v1/apy/latest?lst=${sanctumMints}`,
                { signal: AbortSignal.timeout(5000) }
            );
            if (sanctumRes.ok) {
                const data = await sanctumRes.json();
                // Expected shape: { apys: { [mint]: number (as decimal, e.g. 0.064) } }
                if (data?.apys && typeof data.apys === "object") {
                    for (const [mint, apyVal] of Object.entries(data.apys)) {
                        if (mint in rates && typeof apyVal === "number") {
                            rates[mint] = {
                                apy: parseFloat((apyVal * 100).toFixed(2)),
                                source: "live",
                                protocol: rates[mint].protocol,
                                symbol: rates[mint].symbol,
                            };
                        }
                    }
                }
            }
        } catch {
            // Sanctum API may be unavailable — fallbacks are already set
        }

        // ─── Source 3: Native Solana staking APY (Stakeview) ────────
        const nativeStakeMint = "STAKED_SOL_NATIVE";
        try {
            const stakeviewRes = await fetch("https://stakeview.app/apy/previous.json", {
                signal: AbortSignal.timeout(5000),
            });
            if (stakeviewRes.ok) {
                const data = await stakeviewRes.json();
                // Returns array of validators with APYs — compute network average
                if (Array.isArray(data) && data.length > 0) {
                    const apys = data
                        .map((v: any) => v.apy)
                        .filter((a: any) => typeof a === "number" && a > 0 && a < 1); // decimal format: 0.065 = 6.5%
                    if (apys.length > 0) {
                        const avgDecimal = apys.reduce((s: number, a: number) => s + a, 0) / apys.length;
                        const avgApy = avgDecimal * 100; // convert to percentage
                        rates[nativeStakeMint] = {
                            apy: parseFloat(avgApy.toFixed(2)),
                            source: "live",
                            protocol: "Native Staking",
                            symbol: "Staked SOL",
                        };
                    }
                }
            }
        } catch {
            // Fallback already set from registry
        }

        // ─── Source 4: Jito staking page scrape fallback ───────────
        const jitoMint = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";
        if (rates[jitoMint]?.source !== "live") {
            try {
                // Jito's public endpoint for SOL price ratio over time
                // The APY can be inferred, but for reliability we use a known public stats endpoint
                const jitoRes = await fetch("https://www.jito.network/api/staking", {
                    signal: AbortSignal.timeout(5000),
                });
                if (jitoRes.ok) {
                    const data = await jitoRes.json();
                    // Shape varies — try to extract APY if available
                    if (typeof data?.apy === "number") {
                        rates[jitoMint] = {
                            apy: parseFloat((data.apy * 100).toFixed(2)),
                            source: "live",
                            protocol: "Jito",
                            symbol: "JitoSOL",
                        };
                    }
                }
            } catch {
                // Fallback is already set
            }
        }

        // Update cache
        cachedRates = rates;
        cacheTimestamp = now;

        return NextResponse.json({
            rates,
            fetchedAt: new Date(now).toISOString(),
            cached: false,
        });
    } catch (error) {
        console.error("Yield rates API error:", error);
        // Even on total failure, return fallback rates so the UI always has something
        const fallbackRates: Record<string, { apy: number; source: "live" | "estimated"; protocol: string; symbol: string }> = {};
        for (const [mint, meta] of Object.entries(YIELD_MINTS)) {
            fallbackRates[mint] = {
                apy: meta.fallbackApy,
                source: "estimated",
                protocol: meta.protocol,
                symbol: meta.symbol,
            };
        }
        return NextResponse.json({
            rates: fallbackRates,
            fetchedAt: new Date().toISOString(),
            cached: false,
            error: "Failed to fetch live rates — showing estimates",
        });
    }
}
