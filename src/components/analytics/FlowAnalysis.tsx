"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from "recharts";
import { useVault } from "@/lib/contexts/VaultContext";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { ArrowDownLeft, ArrowUpRight, Loader2, Repeat, TrendingUp } from "lucide-react";

interface FlowPeriod {
    date: string;
    inflow: number;
    outflow: number;
    swap: number;
    staking: number;
    net: number;
    txCount: number;
}

interface FlowSummary {
    totalInflow: number;
    totalOutflow: number;
    totalSwap: number;
    totalStaking: number;
    netFlow: number;
    largestTx: { signature: string; amount: number; token: string; category: string } | null;
}

export const FlowAnalysis = () => {
    const { activeVault } = useVault();
    const sim = useSimulationStore();
    const [flows, setFlows] = useState<FlowPeriod[]>([]);
    const [summary, setSummary] = useState<FlowSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");

    useEffect(() => {
        if (!activeVault) { setFlows([]); setSummary(null); return; }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/analytics/flows?address=${activeVault}&months=6&granularity=${granularity}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) {
                    setFlows(data.flows || []);
                    setSummary(data.summary || null);
                }
            } catch { /* ignore */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [activeVault, granularity]);

    const chartData = useMemo(() => {
        return flows.map(f => ({
            date: granularity === "monthly"
                ? f.date
                : new Date(f.date).toLocaleDateString("default", { month: "short", day: "numeric" }),
            Inflow: Math.round(f.inflow),
            Outflow: Math.round(f.outflow), // keep positive — chart uses separate bars
            Net: Math.round(f.net),
        }));
    }, [flows, granularity]);

    const formatUsd = (v: number) => {
        if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
        if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}K`;
        return `$${v.toFixed(0)}`;
    };

    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Inflow / Outflow</span>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Repeat size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault to analyze flows</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl bg-card border p-6 backdrop-blur-xl shadow-sm ${sim.active ? "border-orange-500/30" : "border-border"}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <Repeat size={14} className="text-primary" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                        Inflow / Outflow Analysis
                    </span>
                    {loading && <Loader2 size={10} className="animate-spin text-primary" />}
                </div>
                <div className="flex gap-1">
                    {(["weekly", "monthly"] as const).map(g => (
                        <button
                            key={g}
                            onClick={() => setGranularity(g)}
                            className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                                granularity === g ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                            }`}
                        >
                            {g === "weekly" ? "Weekly" : "Monthly"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <SummaryCard icon={<ArrowDownLeft size={10} />} label="Total Inflow" value={formatUsd(summary.totalInflow)} color="text-primary" />
                    <SummaryCard icon={<ArrowUpRight size={10} />} label="Total Outflow" value={formatUsd(summary.totalOutflow)} color="text-destructive" />
                    <SummaryCard icon={<TrendingUp size={10} />} label="Net Flow" value={formatUsd(summary.netFlow)} color={summary.netFlow >= 0 ? "text-primary" : "text-destructive"} />
                    <SummaryCard icon={<Repeat size={10} />} label="Swaps" value={formatUsd(summary.totalSwap)} color="text-blue-500" />
                </div>
            )}

            {/* Chart */}
            <div className="h-[220px] w-full">
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] text-muted-foreground/60">{loading ? "Loading flow data..." : "No flow data for this period"}</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--dashboard-muted-foreground)", fontSize: 9, fontWeight: 700 }}
                                minTickGap={30}
                            />
                            <YAxis
                                hide
                                domain={[0, "auto"]}
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
                                    `$${Math.abs(value).toLocaleString()}`,
                                    name,
                                ]}
                            />
                            <Bar dataKey="Inflow" fill="var(--dashboard-accent, #36e27b)" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={16} />
                            <Bar dataKey="Outflow" fill="var(--destructive, #ef4444)" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={16} />
                            <Line type="monotone" dataKey="Net" stroke="var(--primary, #8b5cf6)" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const SummaryCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
    <div className="p-2 rounded-lg bg-muted/30 border border-border text-center">
        <div className={`flex items-center justify-center gap-1 mb-1 ${color}`}>{icon}</div>
        <span className="text-[8px] text-muted-foreground uppercase font-black block">{label}</span>
        <span className={`text-[11px] font-bold ${color}`}>{value}</span>
    </div>
);
