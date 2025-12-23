"use client";

import React from "react";
import { History, Activity, ArrowRight, ChevronRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TreasuryRightPanel() {
    return (
        <aside className="w-80 bg-sidebar/50 border-l border-border/40 p-4 shrink-0 flex flex-col gap-6 hidden xl:flex">

            {/* Vector History Widget */}
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                    <History size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Vector History</span>
                </div>

                <div className="flex flex-col gap-3">
                    {[
                        { label: "CONTRIBUTOR_AIRDROP_Q4", amount: "50,000 USDC", count: 124, status: "success" },
                        { label: "SECURITY_BOUNTY_REW...", amount: "12,500 USDC", count: 12, status: "success" },
                    ].map((item, i) => (
                        <div key={i} className="group p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-primary/20 hover:bg-zinc-900 transition-all cursor-pointer">
                            <div className="flex items-start justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 group-hover:text-white truncate max-w-[140px]">
                                    {item.label}
                                </span>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-orange-500'}`} />
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-mono text-zinc-400">{item.amount}</span>
                                    <span className="text-[9px] text-zinc-600">{item.count} Recipients</span>
                                </div>
                                <ChevronRight size={14} className="text-zinc-700 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    ))}
                    <button className="w-full py-2.5 mt-1 rounded-lg border border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                        View All Distributions
                    </button>
                </div>
            </div>

            {/* Network Throughput Widget */}
            <div className="mt-auto p-4 rounded-2xl bg-zinc-900/80 border border-border/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Activity size={40} />
                </div>
                <div className="flex items-center gap-2 mb-3 text-emerald-400">
                    <Zap size={14} fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Network_Throughput</span>
                </div>
                <div className="flex items-end justify-between font-mono text-xs mb-1">
                    <span className="text-zinc-500">SOLANA_MAINNET</span>
                    <span className="text-white font-bold">2.4K TPS</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[75%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
            </div>

        </aside>
    );
}
