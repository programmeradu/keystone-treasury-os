import { NextRequest, NextResponse } from "next/server";

/**
 * /api/analytics/fees — Extract fee and cost data from transaction history
 *
 * GET ?address=<vault>&months=6
 */

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const address = searchParams.get("address");
        const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") || "6")));

        if (!address || address.length < 20) {
            return NextResponse.json({ error: "Valid address required" }, { status: 400 });
        }

        const cacheKey = `fees:${address}:${months}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
        if (!HELIUS_API_KEY) {
            return NextResponse.json({ error: "HELIUS_API_KEY not configured" }, { status: 500 });
        }

        // Fetch transactions
        const allTx: any[] = [];
        let beforeSig: string | undefined;
        const cutoff = Math.floor((Date.now() - months * 30 * 24 * 60 * 60 * 1000) / 1000);

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

            for (const tx of txs) {
                if (tx.timestamp && tx.timestamp >= cutoff) allTx.push(tx);
            }

            if ((txs[txs.length - 1]?.timestamp || 0) < cutoff) break;
            beforeSig = txs[txs.length - 1]?.signature;
            if (!beforeSig) break;
        }

        // Fetch SOL price for USD conversion
        let solPrice = 200;
        try {
            const priceRes = await fetch("https://price.jup.ag/v6/price?ids=SOL", { next: { revalidate: 300 } });
            if (priceRes.ok) {
                const pd = await priceRes.json();
                solPrice = pd?.data?.SOL?.price || solPrice;
            }
        } catch { /* fallback */ }

        // Process fees
        interface FeeEntry {
            signature: string;
            timestamp: number;
            date: string;
            type: string;
            feeSol: number;
            feeUsd: number;
            feePayer: string;
        }

        const feeEntries: FeeEntry[] = [];

        for (const tx of allTx) {
            const feeSol = (tx.fee || 0) / 1e9;
            const feeUsd = feeSol * solPrice;
            const date = new Date(tx.timestamp * 1000).toISOString().split("T")[0];

            feeEntries.push({
                signature: tx.signature,
                timestamp: tx.timestamp,
                date,
                type: tx.type || "UNKNOWN",
                feeSol,
                feeUsd: Math.round(feeUsd * 10000) / 10000,
                feePayer: tx.feePayer || address,
            });
        }

        // Group by day
        const dailyMap = new Map<string, { date: string; totalFees: number; totalFeeSol: number; txCount: number }>();
        for (const entry of feeEntries) {
            const existing = dailyMap.get(entry.date) || { date: entry.date, totalFees: 0, totalFeeSol: 0, txCount: 0 };
            existing.totalFees += entry.feeUsd;
            existing.totalFeeSol += entry.feeSol;
            existing.txCount++;
            dailyMap.set(entry.date, existing);
        }

        const daily = Array.from(dailyMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({
                date: d.date,
                totalFees: Math.round(d.totalFees * 100) / 100,
                totalFeeSol: Math.round(d.totalFeeSol * 100000) / 100000,
                txCount: d.txCount,
                avgFee: d.txCount > 0 ? Math.round((d.totalFees / d.txCount) * 10000) / 10000 : 0,
            }));

        // Group by type
        const typeMap = new Map<string, { type: string; totalFees: number; totalFeeSol: number; count: number }>();
        for (const entry of feeEntries) {
            const existing = typeMap.get(entry.type) || { type: entry.type, totalFees: 0, totalFeeSol: 0, count: 0 };
            existing.totalFees += entry.feeUsd;
            existing.totalFeeSol += entry.feeSol;
            existing.count++;
            typeMap.set(entry.type, existing);
        }

        const byType = Array.from(typeMap.values())
            .map(t => ({
                type: t.type,
                totalFees: Math.round(t.totalFees * 100) / 100,
                totalFeeSol: Math.round(t.totalFeeSol * 100000) / 100000,
                count: t.count,
            }))
            .sort((a, b) => b.totalFees - a.totalFees);

        // Summary
        const totalFeeSol = feeEntries.reduce((s, e) => s + e.feeSol, 0);
        const totalFeeUsd = totalFeeSol * solPrice;
        const highestFee = feeEntries.reduce(
            (max, e) => e.feeUsd > max.feeUsd ? e : max,
            feeEntries[0] || { feeUsd: 0, signature: "", type: "" }
        );

        const result = {
            address,
            months,
            transactionCount: feeEntries.length,
            totalFeeSol: Math.round(totalFeeSol * 100000) / 100000,
            totalFeeUsd: Math.round(totalFeeUsd * 100) / 100,
            avgFeePerTx: feeEntries.length > 0
                ? Math.round((totalFeeUsd / feeEntries.length) * 10000) / 10000
                : 0,
            highestFee: highestFee ? {
                signature: highestFee.signature,
                feeSol: highestFee.feeSol,
                feeUsd: highestFee.feeUsd,
                type: highestFee.type,
            } : null,
            solPrice,
            daily,
            byType,
            computedAt: Date.now(),
        };

        cache.set(cacheKey, { data: result, ts: Date.now() });

        return NextResponse.json(result, {
            headers: { "Cache-Control": "public, max-age=300" },
        });
    } catch (err: any) {
        console.error("[Analytics/Fees] Error:", err);
        return NextResponse.json({ error: err?.message || "Failed to compute fees" }, { status: 500 });
    }
}
