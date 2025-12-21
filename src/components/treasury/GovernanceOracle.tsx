"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Gavel,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    BarChart3,
    ShieldAlert,
    ExternalLink,
    Scale,
    TrendingUp,
    Zap,
    Eye
} from "lucide-react";
import { useBroadcastEvent, useEventListener, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Proposal {
    id: string;
    title: string;
    status: "ACTIVE" | "PASSED" | "FAILED";
    endTime: string;
    votes: { for: string; against: string };
    quorum: string;
    description: string;
}

const PROPOSALS: Proposal[] = [
    {
        id: "prop_01",
        title: "KIP-014: Ecosystem Grant Allocation Phase 4",
        status: "ACTIVE",
        endTime: "22H_REMAINING",
        votes: { for: "1.2M", against: "420K" },
        quorum: "85%",
        description: "Allocate 200,000 USDC for Q1 ecosystem development grants specifically targeting DeFi infrastructure."
    },
    {
        id: "prop_02",
        title: "KIP-013: Adjust Stability Fee for Sol-Bridged Assets",
        status: "PASSED",
        endTime: "COMPLETED",
        votes: { for: "4.5M", against: "124K" },
        quorum: "100%",
        description: "Permanent reduction of the stability fee from 2.5% to 1.8% for all SOL-collateralized positions."
    },
];

export function GovernanceOracle() {
    const broadcast = useBroadcastEvent();
    const others = useOthers();
    const [simulatingPropId, setSimulatingPropId] = useState<string | null>(null);

    const othersInModule = others.filter(other => (other.presence as any)?.module === "GOVERNANCE");

    useEventListener(({ event }) => {
        if (event.type === "SIGNAL" && event.payload.type === "GOV_SIM_START") {
            setSimulatingPropId(event.payload.propId);
            setTimeout(() => setSimulatingPropId(null), 5000);
        }
    });

    const handleSimulate = (propId: string) => {
        broadcast({
            type: "SIGNAL",
            payload: { type: "GOV_SIM_START", propId }
        });
        // In real app, this would trigger a backend/on-chain simulation
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2">Governance Oracle</h2>
                    <p className="text-muted-foreground text-sm italic font-mono uppercase tracking-widest text-xs opacity-60">KE_OS // DECENTRALIZED_DECISION_MATRIX</p>
                </div>
                <div className="flex gap-4">
                    {/* Collaborative Status */}
                    <div className="flex -space-x-1.5 mr-4 items-center">
                        {othersInModule.map(other => (
                            <Avatar key={other.connectionId} className="h-6 w-6 ring-2 ring-background border border-border">
                                <AvatarImage src={other.info?.avatar} />
                                <AvatarFallback className="text-[6px]">{other.info?.name.substring(0, 1)}</AvatarFallback>
                            </Avatar>
                        ))}
                        {othersInModule.length > 0 && (
                            <span className="ml-3 text-[8px] font-black text-primary uppercase tracking-widest">{othersInModule.length} ANALYSTS_ONLINE</span>
                        )}
                    </div>

                    <div className="px-4 py-2 bg-muted border border-border rounded-xl flex items-center gap-3 shadow-sm">
                        <Scale size={14} className="text-primary" />
                        <span className="text-[10px] font-mono text-muted-foreground">VOTING_WEIGHT: 1.4M $KEY</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 1. Governance HUD (1 Column) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-card border border-primary/20 flex flex-col gap-8 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={14} className="text-muted-foreground" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Voters</span>
                            </div>
                            <div className="text-4xl font-black text-foreground tracking-tighter">1,248</div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-muted-foreground">Participation Rate</span>
                                <span className="text-foreground">68%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full w-[68%] bg-primary shadow-[0_0_10px_var(--dashboard-accent-muted)]" />
                            </div>
                        </div>

                        <button className="w-full py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20">
                            Delegate Power
                        </button>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-card border border-border flex flex-col gap-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="text-destructive font-black" size={18} />
                            <span className="text-[10px] font-black text-destructive uppercase tracking-widest">Critical Alert</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">KIP-014 requires 200k more votes to reach quorum before the window closes.</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60 font-black">
                            <Clock size={12} />
                            <span>T-MINUS 22:14:04</span>
                        </div>
                    </div>
                </div>

                {/* 2. Proposal Feed (3 Columns) */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="flex-1 bg-card border border-border rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Gavel size={20} />
                            </div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest text-[11px]">Tactical Proposal Feed</h3>
                        </div>

                        <div className="flex flex-col gap-6">
                            {PROPOSALS.map((prop) => (
                                <div key={prop.id} className="p-8 rounded-[2rem] bg-background border border-border flex flex-col gap-6 hover:border-primary/30 transition-all group shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-3 max-w-2xl">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${prop.status === "ACTIVE"
                                                    ? "bg-primary/10 border-primary/30 text-primary"
                                                    : prop.status === "PASSED"
                                                        ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                                        : "bg-destructive/10 border-destructive/30 text-destructive"
                                                    }`}>
                                                    {prop.status}
                                                </span>
                                                <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">{prop.endTime}</span>
                                            </div>
                                            <h4 className="text-xl font-black text-foreground uppercase tracking-tighter group-hover:text-primary transition-colors">{prop.title}</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{prop.description}</p>
                                        </div>
                                        <button className="p-3 bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                                            <ExternalLink size={18} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">For</span>
                                            <span className="text-lg font-black text-primary font-mono">{prop.votes.for}</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Against</span>
                                            <span className="text-lg font-black text-destructive font-mono">{prop.votes.against}</span>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Quorum</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-foreground font-mono">{prop.quorum}</span>
                                                <CheckCircle2 size={14} className="text-primary" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-3">
                                            {simulatingPropId === prop.id && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/30"
                                                >
                                                    <Zap size={10} className="text-primary animate-pulse" />
                                                    <span className="text-[7px] font-black text-primary uppercase tracking-widest">Team_Simulating</span>
                                                </motion.div>
                                            )}
                                            <button
                                                onClick={() => handleSimulate(prop.id)}
                                                className="px-6 py-2.5 bg-muted border border-border rounded-xl text-[10px] font-black text-foreground uppercase tracking-widest hover:bg-muted/80 transition-colors flex items-center gap-2 group/btn shadow-sm"
                                            >
                                                <BarChart3 size={14} className="group-hover/btn:text-primary transition-colors" />
                                                Impact_Sim
                                            </button>
                                        </div>
                                    </div>

                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
                                        <div className="h-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" style={{ width: '75%' }} />
                                        <div className="h-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.3)]" style={{ width: '15%' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
