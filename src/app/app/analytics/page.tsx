"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { ValueStreamChart } from "@/components/charts/ValueStreamChart";
import { PredictiveRunway } from "@/components/analytics/PredictiveRunway";
import { MarketSentiment } from "@/components/analytics/MarketSentiment";
import { RefreshCw, TrendingUp, ShieldAlert, BarChart3 } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { useVault } from "@/lib/contexts/VaultContext";
import { Suspense } from "react";
import { NetworkSelector } from "@/components/NetworkSelector";

export default function AnalyticsPage() {
    const { setActiveVault, refresh, vaultTokens, vaultValue, loading } = useVault();
    const [localVaultAddress, setLocalVaultAddress] = useState("");
    const [performanceData, setPerformanceData] = useState<{ date: string; value: number }[]>([]);

    // Unified Allocation Data from Context
    const allocationData = useMemo(() => {
        return vaultTokens
            .map(t => ({
                name: t.symbol || t.mint.substring(0, 4),
                value: t.value || 0
            }))
            .filter(t => t.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [vaultTokens]);

    // Mock historical data for stream chart (Phase 12 simplified)
    useEffect(() => {
        const historical = [
            { date: "Oct", value: 420000 },
            { date: "Nov", value: 480000 },
            { date: "Dec", value: 520000 },
            { date: "Jan", value: vaultValue || 14250592 }
        ];
        setPerformanceData(historical);
    }, [vaultValue]);

    const handleRunEngine = async () => {
        if (!localVaultAddress) return;
        setActiveVault(localVaultAddress);
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Analytics Header (Consolidated) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-primary" size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-foreground">Intelligence & Analytics</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        className="h-8 w-64 bg-muted border border-border rounded-lg px-3 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
                        placeholder="Vault PDA Address..."
                        value={localVaultAddress}
                        onChange={(e) => setLocalVaultAddress(e.target.value)}
                    />
                    <button
                        onClick={handleRunEngine}
                        className="h-8 px-4 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={12} /> : "Run Engine"}
                    </button>

                    <div className="w-px h-6 bg-border" />

                    <NetworkSelector />

                    <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-border" />

                    <WalletButton />
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-[1600px] mx-auto">

                    {/* Main Growth Chart */}
                    <div className="md:col-span-4 lg:col-span-4 rounded-2xl bg-card border border-border p-6 backdrop-blur-xl relative group shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-1">Growth Stream</span>
                                <h3 className="text-2xl font-bold tracking-tighter text-foreground">Treasury Performance</h3>
                            </div>
                            <div className="flex gap-2">
                                {["1D", "1W", "1M", "1Y", "ALL"].map(t => (
                                    <button key={t} className="px-2 py-1 rounded bg-muted text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors border border-border shadow-sm">{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[250px] w-full">
                            <ValueStreamChart data={performanceData} />
                        </div>
                    </div>

                    {/* Asset Allocation Donut (Moved Up) */}
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Allocation Mix</span>
                        <PortfolioDonut data={allocationData.length > 0 ? allocationData : [{ name: "Empty", value: 100 }]} />

                        <div className="mt-6 space-y-2">
                            {allocationData.slice(0, 4).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center px-3 py-2 rounded-lg bg-muted/30 border border-border shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ["var(--dashboard-accent)", "#25a85c", "#1c7a43", "#12502c"][idx % 4] }} />
                                        <span className="text-[10px] font-bold text-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">${item.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Predictive Runway (Phase 15 - Future) */}
                    <div className="md:col-span-4 lg:col-span-4">
                        <PredictiveRunway />
                    </div>

                    {/* Market Sentiment (New Intelligent Card) */}
                    <div className="md:col-span-2 lg:col-span-2">
                        <MarketSentiment />
                    </div>

                    {/* Risk Metrics Row */}
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-card border border-border p-6 backdrop-blur-xl flex flex-col justify-between shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="text-primary" size={14} />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Risk Scorecard</span>
                        </div>
                        <div className="text-center py-4">
                            <span className="text-5xl font-bold tracking-tighter text-primary">04</span>
                            <span className="block text-[10px] text-muted-foreground mt-2 font-medium">TREASURY VOLATILITY (L)</span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
                            <div className="w-[40%] h-full bg-primary" />
                        </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-card border border-border p-6 backdrop-blur-xl flex flex-col justify-between shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-primary" size={14} />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Yield Efficiency</span>
                        </div>
                        <div className="text-center py-4">
                            <span className="text-5xl font-bold tracking-tighter text-foreground">8.4<span className="text-2xl text-primary">%</span></span>
                            <span className="block text-[10px] text-muted-foreground mt-2 font-medium">WEIGHTED APY</span>
                        </div>
                        <div className="flex justify-between mt-2 border-t border-border pt-4">
                            <div className="text-center">
                                <span className="block text-[10px] text-muted-foreground">Projected</span>
                                <span className="text-[12px] font-bold text-foreground">+$42.5k</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] text-muted-foreground">Month</span>
                                <span className="text-[12px] font-bold text-primary">+2.1%</span>
                            </div>
                        </div>
                    </div>

                    {/* Historical Log (Simplified) */}
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Activity Stream</span>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 items-start opacity-70">
                                    <div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-[10px] font-mono text-foreground">{i}</div>
                                    <div>
                                        <p className="text-[10px] leading-tight text-foreground font-medium">SOL stake executed by Agent</p>
                                        <span className="text-[8px] text-muted-foreground font-bold">{i * 2}h ago • Success</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
