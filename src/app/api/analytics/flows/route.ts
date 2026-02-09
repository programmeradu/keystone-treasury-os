import { NextRequest, NextResponse } from "next/server";

/**
 * /api/analytics/flows — Categorize transactions into typed flows
 *
 * Uses Helius Enhanced Transactions API to classify each transaction as
 * inflow, outflow, swap, staking, or other. Groups by time period.
 *
 * GET ?address=<vault>&months=6&granularity=weekly
 */

export const dynamic = "force-dynamic";

// In-memory cache (5 min TTL)
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Known stablecoins (always ~$1)
const STABLECOINS = new Set(["USDC", "USDT", "BUSD", "DAI", "TUSD", "USDP", "FRAX", "LUSD", "PYUSD", "GUSD"]);

interface DetailedFlow {
    signature: string;
    timestamp: number;
    date: string;
    category: "inflow" | "outflow" | "swap" | "staking" | "other";
    type: string; // Helius tx type
    amountUsd: number;
    token: string;
    tokenAmount: number;
    counterparty: string | null;
    fee: number; // SOL
}

interface AggregatedPeriod {
    date: string;
    inflow: number;
    outflow: number;
    swap: number;
    staking: number;
    other: number;
    net: number;
    txCount: number;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");
        const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") || "6")));
        const granularity = searchParams.get("granularity") || "weekly"; // daily | weekly | monthly

        if (!address || address.length < 20) {
            return NextResponse.json({ error: "Valid address required" }, { status: 400 });
        }

        const cacheKey = `flows:${address}:${months}:${granularity}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
        if (!HELIUS_API_KEY) {
            return NextResponse.json({ error: "HELIUS_API_KEY not configured" }, { status: 500 });
        }

        // ─── Fetch enhanced transactions ─────────────────────────────
        const allTx: any[] = [];
        let beforeSig: string | undefined;

        for (let page = 0; page < 5; page++) {
            const qp = new URLSearchParams({
                "api-key": HELIUS_API_KEY,
                limit: "100",
            });
            if (beforeSig) qp.set("before", beforeSig);

            const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?${qp}`;
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) break;

            const txs = await res.json();
            if (!Array.isArray(txs) || txs.length === 0) break;

            const cutoff = Math.floor((Date.now() - months * 30 * 24 * 60 * 60 * 1000) / 1000);
            for (const tx of txs) {
                if (tx.timestamp && tx.timestamp >= cutoff) allTx.push(tx);
            }

            const lastTs = txs[txs.length - 1]?.timestamp || 0;
            if (lastTs < cutoff) break;
            beforeSig = txs[txs.length - 1]?.signature;
            if (!beforeSig) break;
        }

        // ─── Fetch current SOL price for fee valuation ───────────────
        let solPrice = 200;
        try {
            const priceRes = await fetch(
                `https://price.jup.ag/v6/price?ids=SOL`,
                { next: { revalidate: 300 } }
            );
            if (priceRes.ok) {
                const pd = await priceRes.json();
                solPrice = pd?.data?.SOL?.price || solPrice;
            }
        } catch { /* use fallback */ }

        // ─── Categorize each transaction ─────────────────────────────
        const detailed: DetailedFlow[] = [];

        for (const tx of allTx) {
            const ts = tx.timestamp * 1000;
            const dateStr = new Date(ts).toISOString().split("T")[0];
            const heliusType: string = tx.type || "UNKNOWN";
            const fee = (tx.fee || 0) / 1e9;

            // Determine category from Helius type
            let category: DetailedFlow["category"] = "other";
            if (["TRANSFER", "TRANSFER_CHECKED"].includes(heliusType)) {
                // Check direction
                const isIncoming = (tx.nativeTransfers || []).some((nt: any) => nt.toUserAccount === address && nt.amount > 0)
                    || (tx.tokenTransfers || []).some((tt: any) => tt.toUserAccount === address);
                const isOutgoing = (tx.nativeTransfers || []).some((nt: any) => nt.fromUserAccount === address && nt.amount > 0)
                    || (tx.tokenTransfers || []).some((tt: any) => tt.fromUserAccount === address);

                if (isIncoming && !isOutgoing) category = "inflow";
                else if (isOutgoing && !isIncoming) category = "outflow";
                else category = "swap"; // Both directions in same tx = likely swap
            } else if (heliusType === "SWAP") {
                category = "swap";
            } else if (["STAKE", "UNSTAKE", "STAKE_SOL", "UNSTAKE_SOL"].includes(heliusType)) {
                category = "staking";
            } else if (["TOKEN_MINT", "COMPRESSED_NFT_MINT"].includes(heliusType)) {
                category = "inflow";
            } else if (heliusType === "BURN") {
                category = "outflow";
            }

            // Compute USD amount (largest token transfer or native transfer)
            let maxAmount = 0;
            let maxToken = "SOL";
            let maxTokenAmount = 0;
            let counterparty: string | null = null;

            // Check native transfers
            for (const nt of (tx.nativeTransfers || [])) {
                const amt = Math.abs(nt.amount || 0) / 1e9;
                const usd = amt * solPrice;
                if (usd > maxAmount) {
                    maxAmount = usd;
                    maxToken = "SOL";
                    maxTokenAmount = amt;
                    counterparty = nt.toUserAccount === address ? nt.fromUserAccount : nt.toUserAccount;
                }
            }

            // Check token transfers
            for (const tt of (tx.tokenTransfers || [])) {
                const symbol = tt.symbol || tt.mint?.substring(0, 6) || "SPL";
                const amount = Math.abs(tt.tokenAmount || 0);
                // Estimate USD: stablecoins = amount, SOL = amount * solPrice, others = rough estimate
                let usd = 0;
                if (STABLECOINS.has(symbol.toUpperCase())) {
                    usd = amount;
                } else if (symbol.toUpperCase() === "SOL") {
                    usd = amount * solPrice;
                } else {
                    // Use price_info if available from Helius, otherwise skip
                    usd = amount * (tt.price || 0);
                }

                if (usd > maxAmount) {
                    maxAmount = usd;
                    maxToken = symbol;
                    maxTokenAmount = amount;
                    counterparty = tt.toUserAccount === address ? tt.fromUserAccount : tt.toUserAccount;
                }
            }

            detailed.push({
                signature: tx.signature,
                timestamp: tx.timestamp,
                date: dateStr,
                category,
                type: heliusType,
                amountUsd: Math.round(maxAmount * 100) / 100,
                token: maxToken,
                tokenAmount: maxTokenAmount,
                counterparty,
                fee,
            });
        }

        // ─── Aggregate by time period ────────────────────────────────
        const getPeriodKey = (date: string): string => {
            const d = new Date(date);
            if (granularity === "daily") return date;
            if (granularity === "monthly") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            // Weekly: use Monday of the week
            const day = d.getDay();
            const monday = new Date(d);
            monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
            return monday.toISOString().split("T")[0];
        };

        const periodMap = new Map<string, AggregatedPeriod>();

        for (const flow of detailed) {
            const key = getPeriodKey(flow.date);
            const existing = periodMap.get(key) || {
                date: key,
                inflow: 0,
                outflow: 0,
                swap: 0,
                staking: 0,
                other: 0,
                net: 0,
                txCount: 0,
            };

            existing[flow.category] += flow.amountUsd;
            existing.net += flow.category === "inflow" || flow.category === "staking"
                ? flow.amountUsd
                : flow.category === "outflow"
                    ? -flow.amountUsd
                    : 0;
            existing.txCount++;
            periodMap.set(key, existing);
        }

        const flows = Array.from(periodMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Summary stats
        const totalInflow = detailed.filter(f => f.category === "inflow").reduce((s, f) => s + f.amountUsd, 0);
        const totalOutflow = detailed.filter(f => f.category === "outflow").reduce((s, f) => s + f.amountUsd, 0);
        const totalSwap = detailed.filter(f => f.category === "swap").reduce((s, f) => s + f.amountUsd, 0);
        const totalStaking = detailed.filter(f => f.category === "staking").reduce((s, f) => s + f.amountUsd, 0);
        const largest = detailed.reduce((max, f) => f.amountUsd > max.amountUsd ? f : max, detailed[0] || { amountUsd: 0 });

        const result = {
            address,
            months,
            granularity,
            transactionCount: detailed.length,
            summary: {
                totalInflow: Math.round(totalInflow),
                totalOutflow: Math.round(totalOutflow),
                totalSwap: Math.round(totalSwap),
                totalStaking: Math.round(totalStaking),
                netFlow: Math.round(totalInflow - totalOutflow),
                largestTx: largest ? {
                    signature: largest.signature,
                    amount: largest.amountUsd,
                    token: largest.token,
                    category: largest.category,
                } : null,
            },
            flows,
            transactions: detailed.slice(0, 200), // cap detail to 200 most recent
            computedAt: Date.now(),
        };

        cache.set(cacheKey, { data: result, ts: Date.now() });

        return NextResponse.json(result, {
            headers: { "Cache-Control": "public, max-age=300" },
        });
    } catch (err: any) {
        console.error("[Analytics/Flows] Error:", err);
        return NextResponse.json({ error: err?.message || "Failed to compute flows" }, { status: 500 });
    }
}
