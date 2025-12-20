"use client";

import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { ValueStreamChart } from "@/components/charts/ValueStreamChart";
import { PredictiveRunway } from "@/components/analytics/PredictiveRunway";
import { MarketSentiment } from "@/components/analytics/MarketSentiment";
import { RefreshCw, TrendingUp, ShieldAlert, BarChart3 } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { Suspense } from "react";

export default function AnalyticsPage() {
    const { connection } = useConnection();
    const [vaultAddress, setVaultAddress] = useState("");
    const [allocationData, setAllocationData] = useState<{ name: string; value: number }[]>([]);
    const [performanceData, setPerformanceData] = useState<{ date: string; value: number }[]>([]);
    const [loading, setLoading] = useState(false);

    // Mock historical data for stream chart (Phase 12 simplified)
    useEffect(() => {
        const historical = [
            { date: "Oct", value: 420000 },
            { date: "Nov", value: 480000 },
            { date: "Dec", value: 520000 },
            { date: "Jan", value: 14250592 } // The massive jump from the design prompt
        ];
        setPerformanceData(historical);
    }, []);

    async function fetchAnalytics() {
        if (!vaultAddress) return;
        setLoading(true);
        try {
            const client = new SquadsClient(connection, {});
            const tokens = await client.getVaultTokens(vaultAddress);

            const mints = tokens.map(t => t.mint);
            const prices = await client.getTokenPrices(mints);

            const enriched = tokens.map(t => ({
                name: t.symbol || t.mint.substring(0, 4),
                value: t.amount * (prices[t.mint] || 0)
            })).filter(t => t.value > 0);

            setAllocationData(enriched.sort((a, b) => b.value - a.value));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-screen bg-[#0B0C10] text-white">
            {/* Analytics Header (Consolidated) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0C10]/50 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_#36e27b]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9eb7a8]">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <BarChart3 className="text-[#36e27b]" size={20} />
                        <h1 className="text-lg font-bold tracking-tight">Intelligence & Analytics</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        className="h-8 w-64 bg-white/5 border border-white/10 rounded-lg px-3 text-[10px] font-mono focus:outline-none focus:border-[#36e27b]/50 transition-colors"
                        placeholder="Vault PDA Address..."
                        value={vaultAddress}
                        onChange={(e) => setVaultAddress(e.target.value)}
                    />
                    <button
                        onClick={fetchAnalytics}
                        className="h-8 px-4 bg-[#36e27b] text-[#0B0C10] rounded-lg text-[10px] font-bold hover:bg-[#25a85c] transition-all flex items-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={12} /> : "Run Engine"}
                    </button>

                    <div className="w-px h-6 bg-white/10" />

                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1F2833]/40 border border-white/5 hover:bg-white/5 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_rgba(54,226,123,0.5)]" />
                        <span className="text-xs font-medium text-white">Devnet</span>
                    </button>

                    <Suspense fallback={<div className="h-8 w-24 bg-white/5 animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-white/10" />

                    <WalletButton />
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-[1600px] mx-auto">

                    {/* Main Growth Chart */}
                    <div className="md:col-span-4 lg:col-span-4 rounded-2xl bg-[#1F2833]/30 border border-white/5 p-6 backdrop-blur-xl relative group">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest font-semibold block mb-1">Growth Stream</span>
                                <h3 className="text-2xl font-bold tracking-tighter">Treasury Performance</h3>
                            </div>
                            <div className="flex gap-2">
                                {["1D", "1W", "1M", "1Y", "ALL"].map(t => (
                                    <button key={t} className="px-2 py-1 rounded bg-white/5 text-[10px] text-[#9eb7a8] hover:text-white transition-colors">{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[250px] w-full">
                            <ValueStreamChart data={performanceData} />
                        </div>
                    </div>

                    {/* Asset Allocation Donut (Moved Up) */}
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-[#1F2833]/30 border border-white/5 p-6 backdrop-blur-xl">
                        <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest font-semibold block mb-4">Allocation Mix</span>
                        <PortfolioDonut data={allocationData.length > 0 ? allocationData : [{ name: "Empty", value: 100 }]} />

                        <div className="mt-6 space-y-2">
                            {allocationData.slice(0, 4).map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ["#36e27b", "#25a85c", "#1c7a43", "#12502c"][idx % 4] }} />
                                        <span className="text-[10px] font-bold">{item.name}</span>
                                    </div>
                                    <span className="text-[10px] text-[#9eb7a8]">${item.value.toLocaleString()}</span>
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
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-[#1F2833]/30 border border-white/5 p-6 backdrop-blur-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="text-[#36e27b]" size={14} />
                            <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest font-semibold">Risk Scorecard</span>
                        </div>
                        <div className="text-center py-4">
                            <span className="text-5xl font-bold tracking-tighter text-[#36e27b]">04</span>
                            <span className="block text-[10px] text-[#9eb7a8] mt-2 font-medium">TREASURY VOLATILITY (L)</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                            <div className="w-[40%] h-full bg-[#36e27b]" />
                        </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-[#1F2833]/30 border border-white/5 p-6 backdrop-blur-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-[#36e27b]" size={14} />
                            <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest font-semibold">Yield Efficiency</span>
                        </div>
                        <div className="text-center py-4">
                            <span className="text-5xl font-bold tracking-tighter text-white">8.4<span className="text-2xl text-[#36e27b]">%</span></span>
                            <span className="block text-[10px] text-[#9eb7a8] mt-2 font-medium">WEIGHTED APY</span>
                        </div>
                        <div className="flex justify-between mt-2 border-t border-white/5 pt-4">
                            <div className="text-center">
                                <span className="block text-[10px] text-[#9eb7a8]">Projected</span>
                                <span className="text-[12px] font-bold text-white">+$42.5k</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] text-[#9eb7a8]">Month</span>
                                <span className="text-[12px] font-bold text-[#36e27b]">+2.1%</span>
                            </div>
                        </div>
                    </div>

                    {/* Historical Log (Simplified) */}
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-[#1F2833]/30 border border-white/5 p-6 backdrop-blur-xl">
                        <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest font-semibold block mb-4">Activity Stream</span>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-3 items-start opacity-70">
                                    <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-mono">{i}</div>
                                    <div>
                                        <p className="text-[10px] leading-tight">SOL stake executed by Agent</p>
                                        <span className="text-[8px] text-[#9eb7a8]">2h ago • Success</span>
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
