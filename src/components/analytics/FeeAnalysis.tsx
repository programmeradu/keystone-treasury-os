"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, PieChart, Pie, Cell } from "recharts";
import { useVault } from "@/lib/contexts/VaultContext";
import { Loader2, Receipt, ExternalLink } from "lucide-react";
import { getTokenColor } from "@/lib/token-colors";

export const FeeAnalysis = () => {
    const { activeVault } = useVault();
    const [feeData, setFeeData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!activeVault) { setFeeData(null); return; }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/analytics/fees?address=${activeVault}&months=6`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setFeeData(data);
            } catch { /* ignore */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [activeVault]);

    // Chart data: daily fees with cumulative
    const dailyChart = useMemo(() => {
        if (!feeData?.daily) return [];
        let cumulative = 0;
        return feeData.daily.map((d: any) => {
            cumulative += d.totalFees;
            return {
                date: new Date(d.date).toLocaleDateString("default", { month: "short", day: "numeric" }),
                fees: d.totalFees,
                cumulative: Math.round(cumulative * 100) / 100,
                txCount: d.txCount,
            };
        });
    }, [feeData]);

    // Pie data: fees by type
    const typeBreakdown = useMemo(() => {
        if (!feeData?.byType) return [];
        return feeData.byType.map((t: any, i: number) => ({
            name: t.type,
            value: t.totalFees,
            count: t.count,
            fill: getTokenColor(t.type + i),
        }));
    }, [feeData]);

    const formatUsd = (v: number) => {
        if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
        if (v >= 1) return `$${v.toFixed(2)}`;
        return `$${v.toFixed(4)}`;
    };

    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Fee Analysis</span>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Receipt size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault to analyze fees</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Receipt size={14} className="text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Fee / Cost Analysis</span>
                {loading && <Loader2 size={10} className="animate-spin text-primary" />}
            </div>

            {/* Summary Cards */}
            {feeData && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-muted/30 border border-border text-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-black block">Total Fees</span>
                        <span className="text-[12px] font-bold text-foreground">{formatUsd(feeData.totalFeeUsd)}</span>
                        <span className="text-[8px] text-muted-foreground font-mono block">{feeData.totalFeeSol?.toFixed(4)} SOL</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30 border border-border text-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-black block">Avg / Tx</span>
                        <span className="text-[12px] font-bold text-foreground">{formatUsd(feeData.avgFeePerTx)}</span>
                        <span className="text-[8px] text-muted-foreground font-mono block">{feeData.transactionCount} txs</span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30 border border-border text-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-black block">Highest Fee</span>
                        {feeData.highestFee && (
                            <>
                                <span className="text-[12px] font-bold text-foreground">{formatUsd(feeData.highestFee.feeUsd)}</span>
                                <button
                                    onClick={() => window.open(`https://explorer.solana.com/tx/${feeData.highestFee.signature}`, "_blank")}
                                    className="text-[7px] text-primary hover:text-foreground transition-colors flex items-center gap-0.5 justify-center mx-auto"
                                >
                                    {feeData.highestFee.signature?.substring(0, 8)}... <ExternalLink size={7} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex gap-4">
                {/* Fee Timeline Chart */}
                <div className="flex-1 h-[180px]">
                    {dailyChart.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-[10px] text-muted-foreground/60">{loading ? "Loading fee data..." : "No fee data available"}</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={dailyChart} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="30%">
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "var(--dashboard-muted-foreground)", fontSize: 8, fontWeight: 700 }}
                                    minTickGap={40}
                                />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--dashboard-card, #1a1a1a)",
                                        border: "1px solid var(--dashboard-border, #333)",
                                        borderRadius: "12px",
                                        fontSize: "9px",
                                        color: "var(--dashboard-foreground, #fff)",
                                    }}
                                    formatter={(value: number, name: string) => [
                                        name === "cumulative" ? formatUsd(value) : formatUsd(value),
                                        name === "cumulative" ? "Cumulative" : "Daily Fees",
                                    ]}
                                />
                                <Bar dataKey="fees" fill="var(--dashboard-accent, #36e27b)" fillOpacity={0.4} radius={[3, 3, 0, 0]} maxBarSize={20} />
                                <Line type="monotone" dataKey="cumulative" stroke="var(--primary, #8b5cf6)" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Type Breakdown Pie */}
                {typeBreakdown.length > 0 && (
                    <div className="w-[120px] h-[180px]">
                        <span className="text-[8px] text-muted-foreground uppercase font-black block mb-1 text-center">By Type</span>
                        <ResponsiveContainer width="100%" height={100}>
                            <PieChart>
                                <Pie
                                    data={typeBreakdown}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={20}
                                    outerRadius={40}
                                    strokeWidth={1}
                                    stroke="var(--dashboard-card)"
                                >
                                    {typeBreakdown.map((entry: any, i: number) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ fontSize: "8px", borderRadius: "8px", backgroundColor: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
                                    formatter={(v: number) => [formatUsd(v)]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-0.5 mt-1">
                            {typeBreakdown.slice(0, 4).map((t: any) => (
                                <div key={t.name} className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.fill }} />
                                    <span className="text-[7px] text-muted-foreground truncate">{t.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
