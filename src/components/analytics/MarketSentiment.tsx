"use client";

import React, { useState, useEffect } from "react";
import { Logo } from "@/components/icons";
import { AlertTriangle, Terminal, Activity, Globe, Twitter, TrendingUp, Search, ExternalLink } from "lucide-react";

export const MarketSentiment = () => {
    // Mock Data simulating a complex RAG (Retrieval Augmented Generation) pipeline
    const metrics = {
        sentiment: { score: 72, label: "Greed", trend: "up" },
        volatility: { score: "High", color: "text-orange-400" },
        whaleActivity: { score: "Accumulating", color: "text-[#36e27b]" }
    };

    const activeSources = [
        { name: "Twitter/X", status: "live", count: 1240 },
        { name: "On-Chain", status: "live", count: "45tx/s" },
        { name: "News Aggregator", status: "crawling", count: "8 articles" }
    ];

    return (
        <div className="h-full rounded-2xl bg-card border border-border p-5 flex flex-col relative overflow-hidden group shadow-sm">
            {/* 1. Terminal Header */}
            <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary blur-[15px] opacity-20" />
                        <Logo size={28} fillColor="var(--dashboard-accent)" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">Keystone Intelligence</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] text-muted-foreground font-mono">NODE_ACTIVE // MODEL-v4</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                <MetricBox label="Composite Score" value={metrics.sentiment.score} sub={metrics.sentiment.label} color="text-primary" />
                <MetricBox label="Volatility" value={metrics.volatility.score} sub="Warning" color="text-orange-500" />
                <MetricBox label="Whale Flow" value="Net +" sub={metrics.whaleActivity.score} color="text-primary" />
            </div>

            {/* 3. The Insight (Structured) */}
            <div className="flex-1 bg-muted/30 rounded-xl p-5 border border-border font-mono text-xs relative overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />

                <div className="space-y-4 relative z-10">
                    <div>
                        <span className="text-muted-foreground uppercase font-bold text-[9px] mb-1 block flex items-center gap-1">
                            <Search size={10} /> Market Observation
                        </span>
                        <p className="text-foreground/90 leading-relaxed font-bold">
                            Cross-chain analytics detect significant capital rotation from ETH mainnet to Solana L2s. <span className="text-primary bg-primary/10 px-1 rounded">SOL/ETH</span> pair strength at 3-month highs.
                        </p>
                    </div>

                    <div className="w-full h-px bg-border" />

                    <div>
                        <span className="text-primary uppercase font-bold text-[9px] mb-1 block flex items-center gap-1">
                            <Terminal size={10} /> Tactical Suggestion
                        </span>
                        <p className="text-foreground/90 leading-relaxed font-bold">
                            Recommended Strategy: Increase liquid staking exposure by <strong className="text-primary">15%</strong>. Hedge potential downside with OTM puts if volatility exceeds 80.
                        </p>
                    </div>
                </div>

                {/* Subtle Matrix background effect */}
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Activity size={100} />
                </div>
            </div>

            {/* 4. Action Footer */}
            <div className="mt-4 flex items-center justify-between gap-3">
                <button className="flex-1 py-2 rounded-lg bg-muted border border-border hover:bg-muted/80 text-[10px] text-muted-foreground font-black uppercase transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <ExternalLink size={12} />
                    View Sources
                </button>
                <button className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-black uppercase transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <TrendingUp size={12} />
                    Apply Strategy
                </button>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, sub, color }: any) => (
    <div className="bg-muted/30 p-2 rounded-lg border border-border flex flex-col items-center justify-center text-center shadow-inner">
        <span className="text-[9px] text-muted-foreground uppercase font-black mb-0.5">{label}</span>
        <span className={`text-xl font-black tracking-tighter ${color}`}>{value}</span>
        <span className="text-[8px] text-muted-foreground/60 uppercase font-black">{sub}</span>
    </div>
);
