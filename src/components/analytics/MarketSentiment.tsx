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
        <div className="h-full rounded-2xl bg-[#0F1115] border border-white/10 p-5 flex flex-col relative overflow-hidden group shadow-2xl">
            {/* 1. Terminal Header */}
            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#36e27b] blur-[15px] opacity-20" />
                        <Logo size={28} fillColor="#36e27b" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-tight uppercase">Keystone Intelligence</h3>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse" />
                            <span className="text-[9px] text-[#9eb7a8] font-mono">NODE_ACTIVE // MODEL-v4</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                <MetricBox label="Composite Score" value={metrics.sentiment.score} sub={metrics.sentiment.label} color="text-[#36e27b]" />
                <MetricBox label="Volatility" value={metrics.volatility.score} sub="Warning" color={metrics.volatility.color} />
                <MetricBox label="Whale Flow" value="Net +" sub={metrics.whaleActivity.score} color={metrics.whaleActivity.color} />
            </div>

            {/* 3. The Insight (Structured) */}
            <div className="flex-1 bg-gradient-to-br from-black/60 to-black/20 rounded-xl p-5 border border-white/5 font-mono text-xs relative overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#36e27b] to-transparent" />

                <div className="space-y-4 relative z-10">
                    <div>
                        <span className="text-[#9eb7a8] uppercase font-bold text-[9px] mb-1 block flex items-center gap-1">
                            <Search size={10} /> Market Observation
                        </span>
                        <p className="text-white/90 leading-relaxed">
                            Cross-chain analytics detect significant capital rotation from ETH mainnet to Solana L2s. <span className="text-[#36e27b] bg-[#36e27b]/10 px-1 rounded">SOL/ETH</span> pair strength at 3-month highs.
                        </p>
                    </div>

                    <div className="w-full h-px bg-white/10" />

                    <div>
                        <span className="text-[#36e27b] uppercase font-bold text-[9px] mb-1 block flex items-center gap-1">
                            <Terminal size={10} /> Tactical Suggestion
                        </span>
                        <p className="text-white/90 leading-relaxed">
                            Recommended Strategy: Increase liquid staking exposure by <strong className="text-white">15%</strong>. Hedge potential downside with OTM puts if volatility exceeds 80.
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
                <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-[#9eb7a8] font-bold border border-white/5 transition-colors flex items-center justify-center gap-2">
                    <ExternalLink size={12} />
                    View Sources
                </button>
                <button className="flex-1 py-2 rounded-lg bg-[#36e27b]/10 hover:bg-[#36e27b]/20 text-[10px] text-[#36e27b] font-bold border border-[#36e27b]/20 transition-colors flex items-center justify-center gap-2">
                    <TrendingUp size={12} />
                    Apply Strategy
                </button>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, sub, color }: any) => (
    <div className="bg-[#1F2833]/30 p-2 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center">
        <span className="text-[9px] text-[#9eb7a8] uppercase font-bold mb-0.5">{label}</span>
        <span className={`text-xl font-black tracking-tighter ${color}`}>{value}</span>
        <span className="text-[8px] opacity-60 uppercase">{sub}</span>
    </div>
);
