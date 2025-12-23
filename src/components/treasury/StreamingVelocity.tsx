"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Zap, Play, Pause, MoreHorizontal, TrendingUp } from "lucide-react";

export function StreamingVelocity() {
    return (
        <div className="flex flex-col h-full gap-2">
            {/* Header Metrics - Slim Row */}
            <div className="flex flex-col xl:flex-row gap-2 h-auto shrink-0">
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                        { label: "Active Streams", val: "12", sub: "+2 this week" },
                        { label: "Total Volume", val: "$42.5K", sub: "/ month" },
                        { label: "Net Flow API", val: "8.2%", sub: "Yield Bearing" },
                        { label: "Vesting", val: "4", sub: "Locked" },
                    ].map((m, i) => (
                        <div key={i} className="px-4 py-2 rounded-lg bg-zinc-900/30 border border-zinc-800/50 flex items-center justify-between group hover:border-zinc-700 transition-colors">
                            <span className="text-[9px] font-bold uppercase text-zinc-500 truncate">{m.label}</span>
                            <div className="text-right">
                                <span className="text-sm font-mono font-black text-white block leading-none">{m.val}</span>
                                <span className="text-[8px] font-mono text-emerald-500 uppercase leading-none">{m.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Flow Chart Area - Expanded */}
            <div className="flex-1 rounded-xl bg-zinc-900/10 border-t border-b border-zinc-800/50 relative overflow-hidden flex flex-col p-4">
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Velocity Vector</h3>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase">Flow // 24H</p>
                    </div>
                    <div className="flex gap-1">
                        <button className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-bold text-white uppercase border border-zinc-700">1H</button>
                        <button className="px-2 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary uppercase border border-primary/20">24H</button>
                    </div>
                </div>

                {/* Mock Chart Visualization */}
                <div className="flex-1 w-full relative flex items-end gap-0.5 pb-0 overflow-hidden">
                    {Array.from({ length: 60 }).map((_, i) => {
                        const h = Math.random() * 80 + 20;
                        return (
                            <motion.div
                                key={i}
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: i * 0.01 }}
                                className={`flex-1 min-w-[4px] bg-gradient-to-t from-primary/5 to-primary rounded-t-sm hover:opacity-100 opacity-60 transition-opacity cursor-crosshair group relative`}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[8px] text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                    ${(h * 120).toFixed(0)}
                                </div>
                            </motion.div>
                        )
                    })}

                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                        <div className="w-full h-px border-t border-zinc-500 border-dashed" />
                        <div className="w-full h-px border-t border-zinc-500 border-dashed" />
                        <div className="w-full h-px border-t border-zinc-500 border-dashed" />
                    </div>
                </div>
            </div>

            {/* Active Streams List - Slim */}
            <div className="h-48 overflow-hidden relative flex flex-col">
                <div className="px-4 py-2 border-b border-zinc-800/50 flex justify-between items-center bg-black/20">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Active Channels</span>
                    <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors">View All</button>
                </div>
                <div className="flex-1 overflow-auto p-2 scrollbar-thin">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5 gap-3">
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors shrink-0">
                                    <Zap size={10} />
                                </div>
                                <div className="min-w-0 flex-1 flex items-center justify-between">
                                    <div className="text-[10px] font-bold text-white uppercase tracking-wide truncate">Engineering_Grant_Wave_{s}</div>
                                    <div className="text-[9px] font-mono text-zinc-500 truncate text-right">0x8a...92f • 120 USDC/D</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
