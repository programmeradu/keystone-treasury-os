"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Waves,
    ArrowUpRight,
    ArrowDownLeft,
    Zap,
    Timer,
    Pause,
    Play,
    TrendingDown,
    Activity,
    Target
} from "lucide-react";

interface Stream {
    id: string;
    target: string;
    rate: string;
    type: "INBOUND" | "OUTBOUND";
    status: "ACTIVE" | "PAUSED";
    progress: number;
}

const STREAMS: Stream[] = [
    { id: "s_01", target: "Core_Team_Payroll", rate: "2,400 USDC / HR", type: "OUTBOUND", status: "ACTIVE", progress: 65 },
    { id: "s_02", target: "Ecosystem_Yield", rate: "1,200 USDC / HR", type: "INBOUND", status: "ACTIVE", progress: 40 },
    { id: "s_03", target: "Infrastructure_DAO", rate: "800 USDC / HR", type: "OUTBOUND", status: "PAUSED", progress: 20 },
];

export function StreamingVelocity() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2">Streaming velocity</h2>
                    <p className="text-muted-foreground text-sm italic font-mono uppercase tracking-widest text-xs opacity-60">KE_OS // REALTIME_FLOW_MONITOR</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-muted border border-border rounded-xl flex items-center gap-3 shadow-sm">
                        <Activity size={14} className="text-primary animate-pulse" />
                        <span className="text-[10px] font-mono text-muted-foreground">THROUGHPUT: 4.4K/S</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 1. Velocity HUD (1 Column) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-card border border-primary/20 flex flex-col gap-8 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingDown size={120} className="text-primary" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Timer size={14} className="text-muted-foreground" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Net Burn Rate</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-foreground tracking-tighter">-2,140</span>
                                <span className="text-sm font-bold text-primary font-mono">USDC / HR</span>
                            </div>
                        </div>

                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Daily Estimate</span>
                                <span className="text-sm font-mono font-bold text-foreground">-51,360 USDC</span>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#ff5b39]"
                                    animate={{ width: ["10%", "60%", "40%"] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                />
                            </div>
                        </div>

                        <button className="relative z-10 w-full py-4 bg-primary/10 border border-primary/30 rounded-2xl text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:bg-primary/20 transition-colors shadow-sm">
                            Optimization Vector
                        </button>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-card border border-border flex flex-col gap-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Target className="text-primary" size={18} />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Efficiency Core</span>
                        </div>
                        <div className="text-3xl font-black text-foreground font-mono tracking-tighter">94.2%</div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">Stream utilization is optimal. Low fragmentation detected in the Liquidity Pool.</p>
                    </div>
                </div>

                {/* 2. Flow Rails (3 Columns) */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="flex-1 bg-card border border-border rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Waves size={20} />
                                </div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest text-[11px]">Real-time Flow Feed</h3>
                            </div>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-muted rounded-full text-[8px] font-black text-muted-foreground uppercase tracking-widest border border-border">Buffer: 98%</div>
                                <div className="px-3 py-1 bg-primary/10 rounded-full text-[8px] font-black text-primary uppercase tracking-widest border border-primary/20">Live_Sync</div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {STREAMS.map((stream) => (
                                <div key={stream.id} className="p-6 rounded-[2rem] bg-background border border-border flex items-center justify-between group hover:border-primary/20 transition-all relative overflow-hidden shadow-sm">
                                    {/* Rail Background Animation */}
                                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,var(--dashboard-accent),transparent)] w-[200%] animate-[slide_3s_linear_infinite]" />
                                    </div>

                                    <div className="flex items-center gap-6 z-10">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${stream.type === "INBOUND"
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "bg-[#ff5b39]/10 border-[#ff5b39]/20 text-[#ff5b39]"
                                            }`}>
                                            {stream.type === "INBOUND" ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-foreground uppercase tracking-widest mb-1">{stream.target}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{stream.rate}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 z-10">
                                        <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                                            <div className="flex justify-between w-full text-[8px] font-mono text-muted-foreground uppercase">
                                                <span>Progress</span>
                                                <span>{stream.progress}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full ${stream.status === "ACTIVE" ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${stream.progress}%` }}
                                                    transition={{ duration: 1.5 }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shadow-sm">
                                                {stream.status === "ACTIVE" ? <Pause size={16} /> : <Play size={16} />}
                                            </button>
                                            <button className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shadow-sm">
                                                <Zap size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Aggregating Flow Data</span>
                                    <span className="text-[8px] text-primary font-mono">SYNCHRONIZING_WITH_ZEBEC_PROTOCOL...</span>
                                </div>
                            </div>
                            <button className="px-6 py-2 bg-muted border border-border rounded-lg text-[9px] font-black text-foreground uppercase tracking-[0.2em] hover:bg-muted/80 transition-colors shadow-sm">
                                Refresh Vector
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes slide {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0%); }
                }
            `}</style>
        </div>
    );
}
