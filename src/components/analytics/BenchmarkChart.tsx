"use client";

import React, { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { useVault } from "@/lib/contexts/VaultContext";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { Loader2, BarChart3 } from "lucide-react";
import { Logo } from "@/components/icons";

const BENCHMARK_COLORS: Record<string, string> = {
    Portfolio: "var(--dashboard-accent, #36e27b)",
    SOL: "#9945FF",
    BTC: "#F7931A",
    ETH: "#627EEA",
};

const MONTHS_OPTIONS = [
    { label: "3M", months: 3 },
    { label: "6M", months: 6 },
    { label: "1Y", months: 12 },
];

export const BenchmarkChart = () => {
    const { activeVault } = useVault();
    const sim = useSimulationStore();
    const simActive = sim.active && !!sim.result;
    const [benchmarks, setBenchmarks] = useState<any[]>([]);
    const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [months, setMonths] = useState(6);

    // Fetch benchmarks and portfolio history in parallel
    useEffect(() => {
        if (!activeVault) return;
        let cancelled = false;
        setLoading(true);

        Promise.allSettled([
            fetch(`/api/analytics/benchmarks?benchmarks=SOL,BTC,ETH&months=${months}`).then(r => r.json()),
            fetch(`/api/analytics/history?address=${activeVault}&months=${months}`).then(r => r.json()),
        ]).then(([benchRes, histRes]) => {
            if (cancelled) return;
            if (benchRes.status === "fulfilled") setBenchmarks(benchRes.value.benchmarks || []);
            if (histRes.status === "fulfilled") setPortfolioHistory(histRes.value.snapshots || []);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [activeVault, months]);

    // Merge all series into unified chart data
    const chartData = useMemo(() => {
        if (benchmarks.length === 0) return [];

        // Use SOL benchmark dates as reference timeline
        const refBenchmark = benchmarks.find(b => b.symbol === "SOL") || benchmarks[0];
        if (!refBenchmark?.data) return [];

        // Build date -> pctChange lookups for each benchmark
        const lookups: Record<string, Record<string, number>> = {};
        for (const b of benchmarks) {
            lookups[b.symbol] = {};
            for (const d of (b.data || [])) {
                lookups[b.symbol][d.date] = d.pctChange;
            }
        }

        // Portfolio % change
        const portfolioLookup: Record<string, number> = {};
        if (portfolioHistory.length > 0) {
            const startVal = portfolioHistory[0].totalValue;
            for (const s of portfolioHistory) {
                const pct = startVal > 0 ? ((s.totalValue - startVal) / startVal) * 100 : 0;
                portfolioLookup[s.date] = Math.round(pct * 100) / 100;
            }
        }

        // Sample every Nth point for readability
        const sampleRate = refBenchmark.data.length > 90 ? 7 : refBenchmark.data.length > 30 ? 3 : 1;

        // Foresight projected % change series
        const simProjection = simActive && sim.result?.projection ? sim.result.projection : null;
        const simStartVal = simProjection?.[0]?.totalValue || 0;

        return refBenchmark.data
            .filter((_: any, i: number) => i % sampleRate === 0 || i === refBenchmark.data.length - 1)
            .map((d: any, idx: number) => {
                const point: Record<string, any> = {
                    date: new Date(d.date).toLocaleDateString("default", { month: "short", day: "numeric" }),
                };
                for (const sym of Object.keys(lookups)) {
                    point[sym] = lookups[sym][d.date] ?? null;
                }
                // Find closest portfolio date
                const portfolioPct = portfolioLookup[d.date];
                point["Portfolio"] = portfolioPct !== undefined ? portfolioPct : null;

                // Foresight projection overlay (spread across data points)
                if (simProjection && simStartVal > 0) {
                    const simIdx = Math.round((idx / Math.max(1, refBenchmark.data.length / sampleRate - 1)) * (simProjection.length - 1));
                    const simPoint = simProjection[Math.min(simIdx, simProjection.length - 1)];
                    if (simPoint) {
                        point["Foresight"] = Math.round(((simPoint.totalValue - simStartVal) / simStartVal) * 10000) / 100;
                    }
                }
                return point;
            });
    }, [benchmarks, portfolioHistory, simActive, sim.result]);

    // Performance summary
    const performanceSummary = useMemo(() => {
        if (chartData.length < 2) return null;
        const last = chartData[chartData.length - 1];
        const portfolioPct = last?.Portfolio ?? 0;
        const solPct = last?.SOL ?? 0;
        const diff = portfolioPct - solPct;
        return {
            portfolioPct,
            solPct,
            btcPct: last?.BTC ?? 0,
            ethPct: last?.ETH ?? 0,
            vsSol: diff,
            outperformed: diff > 0,
        };
    }, [chartData]);

    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Benchmark Comparison</span>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart3 size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault to compare performance</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl bg-card border p-6 backdrop-blur-xl shadow-sm ${simActive ? "border-orange-500/30" : "border-border"}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart3 size={14} className={simActive ? "text-orange-500" : "text-primary"} />
                        <span className={`text-[10px] uppercase tracking-widest font-semibold ${simActive ? "text-orange-500" : "text-muted-foreground"}`}>
                            {simActive ? "Simulated Benchmark" : "Benchmark Comparison"}
                        </span>
                        {loading && <Loader2 size={10} className="animate-spin text-primary" />}
                        {simActive && <Logo size={10} fillColor="#f97316" />}
                    </div>
                    {performanceSummary && (
                        <p className="text-[9px] text-muted-foreground">
                            Your treasury{" "}
                            <span className={performanceSummary.outperformed ? "text-primary font-bold" : "text-destructive font-bold"}>
                                {performanceSummary.outperformed ? "outperformed" : "underperformed"}
                            </span>
                            {" "}SOL by{" "}
                            <span className={performanceSummary.outperformed ? "text-primary" : "text-destructive"}>
                                {performanceSummary.vsSol >= 0 ? "+" : ""}{performanceSummary.vsSol.toFixed(1)}%
                            </span>
                            {" "}over {months} months
                        </p>
                    )}
                </div>
                <div className="flex gap-1">
                    {MONTHS_OPTIONS.map(o => (
                        <button
                            key={o.label}
                            onClick={() => setMonths(o.months)}
                            className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                                months === o.months ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                            }`}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--dashboard-muted-foreground)", fontSize: 9, fontWeight: 700 }}
                            minTickGap={40}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--dashboard-muted-foreground)", fontSize: 9 }}
                            tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--dashboard-card, #1a1a1a)",
                                border: "1px solid var(--dashboard-border, #333)",
                                borderRadius: "12px",
                                fontSize: "10px",
                                color: "var(--dashboard-foreground, #fff)",
                            }}
                            formatter={(value: number, name: string) => [
                                `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
                                name,
                            ]}
                        />
                        <ReferenceLine y={0} stroke="var(--dashboard-border)" strokeDasharray="3 3" />
                        <Legend
                            verticalAlign="top"
                            height={24}
                            iconSize={8}
                            wrapperStyle={{ fontSize: "9px", fontWeight: 700 }}
                        />
                        <Line type="monotone" dataKey="Portfolio" stroke={BENCHMARK_COLORS.Portfolio} strokeWidth={simActive ? 1.5 : 3} dot={false} connectNulls />
                        {simActive && <Line type="monotone" dataKey="Foresight" stroke="#f97316" strokeWidth={3} dot={false} connectNulls />}
                        <Line type="monotone" dataKey="SOL" stroke={BENCHMARK_COLORS.SOL} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
                        <Line type="monotone" dataKey="BTC" stroke={BENCHMARK_COLORS.BTC} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
                        <Line type="monotone" dataKey="ETH" stroke={BENCHMARK_COLORS.ETH} strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
