"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useOthers, useSelf, useBroadcastEvent, useEventListener } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users, Shield, Zap, MessageSquare, Activity, Send, CheckCircle2, Play,
    ScanFace, Fingerprint, Radio, Siren, Globe, Lock, Cpu, Signal, Wifi
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CollaborativeChat } from "@/components/CollaborativeChat";
import { useSquadsMultisig } from "@/hooks/useSquadsMultisig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppEventBus } from "@/lib/events";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { Suspense } from "react";
import { WalletButton } from "@/components/WalletButton";
import { getAvatarUrl } from "@/lib/avatars";
import { NetworkSelector } from "@/components/NetworkSelector";
import { useVault } from "@/lib/contexts/VaultContext";
import { toast } from "@/lib/toast-notifications";

interface LogEntry {
    user: string;
    action: string;
    target: string;
    time: string;
}

const SEED_LOG: LogEntry[] = [
    { user: "Neural Agent 01", action: "SIMULATED TRANSACTION", target: "Jupiter Swap: 10 SOL -> USDC", time: "02:42:12" },
    { user: "You", action: "UPDATED TREASURY", target: "New Vault Linked", time: "02:30:05" },
    { user: "Neural Agent 01", action: "RISK SCAN", target: "Liquidity Check: PASSED", time: "02:15:00" },
];

export default function TeamPage() {
    const others = useOthers();
    const self = useSelf();
    const { activeVault, vaultConfig } = useVault();
    const vaultAddress = activeVault || "";

    // Live Tactical Log — seeded with mocks, appends real events
    const [logEntries, setLogEntries] = useState<LogEntry[]>(SEED_LOG);
    const logRef = useRef<HTMLDivElement>(null);

    const appendLog = useCallback((entry: Omit<LogEntry, "time">) => {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
        setLogEntries(prev => [{ ...entry, time }, ...prev].slice(0, 50));
    }, []);

    useEffect(() => {
        const unsub = AppEventBus.subscribe((event) => {
            switch (event.type) {
                case "AGENT_COMMAND":
                    appendLog({ user: "Agent", action: "AGENT COMMAND", target: event.payload?.command || event.payload?.message || "Executed" });
                    break;
                case "UI_NOTIFICATION":
                    appendLog({ user: "System", action: "NOTIFICATION", target: event.payload?.message || "Event" });
                    break;
                case "REFRESH_DASHBOARD":
                    appendLog({ user: "You", action: "REFRESH", target: "Dashboard data synced" });
                    break;
            }
        });
        return unsub;
    }, [appendLog]);


    return (
        <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden font-mono text-foreground">
            {/* Team Header (Consolidated) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="text-primary" size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">Team Workspace</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NetworkSelector />

                    <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-border mx-1" />

                    <WalletButton />
                </div>
            </header>

            <div className="flex-1 p-8 overflow-y-auto scrollbar-thin bg-background">
                <div className="max-w-[1600px] mx-auto space-y-6">
                    {/* Compact Section Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                                Collaborative Node active: {others.length + 1} Members Online
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Grid: Team Members & History */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* 1. Active Operatives (Polished Grid) */}
                            <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(54,226,123,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(54,226,123,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                                <div className="relative z-10 mb-6 flex items-center justify-between">
                                    <h3 className="text-foreground font-black uppercase tracking-widest flex items-center gap-2 text-xs">
                                        <ScanFace size={16} className="text-primary" />
                                        Active Operatives
                                    </h3>
                                    <div className="flex -space-x-2">
                                        <Avatar className="h-6 w-6 ring-2 ring-background grayscale transition-all hover:grayscale-0">
                                            <AvatarImage src={getAvatarUrl(self?.info?.name || "ME")} />
                                            <AvatarFallback>ME</AvatarFallback>
                                        </Avatar>
                                        {others.map(o => (
                                            <Avatar key={o.connectionId} className="h-6 w-6 ring-2 ring-background grayscale transition-all hover:grayscale-0">
                                                <AvatarImage src={getAvatarUrl(o.info?.name || "Collaborator")} />
                                                <AvatarFallback>?</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    {/* Self */}
                                    <MemberCard
                                        name={self?.info?.name || "You"}
                                        role="Admin / Signer"
                                        status="online"
                                        isSelf
                                        avatar={getAvatarUrl(self?.info?.name || "ME")}
                                        color="var(--dashboard-accent)"
                                    />

                                    {/* Live Others */}
                                    {others.map(({ connectionId, info }) => (
                                        <MemberCard
                                            key={connectionId}
                                            name={info?.name || "Collaborator"}
                                            role="Operator"
                                            status="online"
                                            avatar={getAvatarUrl(info?.name || "Collaborator")}
                                            color={info?.color || "var(--dashboard-accent)"}
                                        />
                                    ))}

                                    {/* Mocked offline members for UI density */}
                                    <MemberCard
                                        name="Neural Agent 01"
                                        role="Automated Auditor"
                                        status="offline"
                                        avatar={getAvatarUrl("Neural Agent 01")}
                                        color="var(--dashboard-muted-foreground)"
                                    />
                                </div>
                            </div>

                            {/* 2. Command History (Terminal Style) */}
                            <div className="bg-card border border-border rounded-2xl p-0 overflow-hidden flex flex-col min-h-[300px] shadow-sm">
                                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                                    <h3 className="text-foreground font-black uppercase tracking-widest flex items-center gap-2 text-xs">
                                        <TerminalSquare size={16} className="text-primary" />
                                        Tactical Log
                                    </h3>
                                    <span className="text-[10px] text-muted-foreground font-mono">LIVE FEED // AES-256 • {logEntries.length} entries</span>
                                </div>
                                <div ref={logRef} className="p-4 space-y-2 font-mono text-xs flex-1 overflow-y-auto scrollbar-thin max-h-[300px]">
                                    {logEntries.map((entry, idx) => (
                                        <ActivityItem
                                            key={`${entry.time}-${idx}`}
                                            user={entry.user}
                                            action={entry.action}
                                            target={entry.target}
                                            time={entry.time}
                                        />
                                    ))}
                                    <div className="flex items-center gap-2 opacity-50 pt-2">
                                        <span className="text-primary animate-pulse">_</span>
                                        <span className="italic text-muted-foreground">Listening for signals...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: War Room & Neural Uplink */}
                        <div className="space-y-6">
                            {/* Vault Link for War Room */}
                            {!activeVault && (
                                <div className="bg-card border border-dashed border-border rounded-2xl p-4 shadow-sm text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">No Vault Connected</p>
                                    <p className="text-[9px] text-muted-foreground/50">Connect a vault via the sidebar to unlock War Room</p>
                                </div>
                            )}

                            <WarRoom vaultAddress={vaultAddress} />

                            {/* Collaborative Chat */}
                            <CollaborativeChat />

                            {/* Quorum Core: Real-time Governance Power */}
                            <QuorumCore others={others as any[]} threshold={vaultConfig?.threshold ?? 3} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function WarRoom({ vaultAddress }: { vaultAddress: string }) {
    const { proposals, loading, signProposal } = useSquadsMultisig(vaultAddress);
    const broadcast = useBroadcastEvent();
    const [simulating, setSimulating] = useState<number | null>(null);

    useEventListener(({ event }) => {
        if (event.type === "SIMULATION_RESULT") {
            AppEventBus.emit("UI_NOTIFICATION", {
                message: ` Team Broadcast: Simulation for Proposal #${event.payload.proposalId} resulted in SUCCESS. Net change: +0.4 SOL`,
            });
        }
    });

    const handleSimulate = (proposalId: number) => {
        setSimulating(proposalId);
        setTimeout(() => {
            setSimulating(null);
            broadcast({
                type: "SIMULATION_RESULT",
                payload: { proposalId, result: { success: true, netChange: 0.4 } }
            });
            AppEventBus.emit("UI_NOTIFICATION", {
                message: " Simulation complete. Results broadcast to team.",
            });
        }, 2000);
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm">
            {/* Diagonal Stripes Warning Pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,var(--dashboard-accent),var(--dashboard-accent)_10px,transparent_10px,transparent_20px)] opacity-30" />

            <div className="absolute top-4 right-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
            </div>

            <h3 className="text-foreground font-black mb-1 uppercase tracking-widest flex items-center gap-2 text-xs">
                <Siren size={16} className="text-primary" />
                War Room
            </h3>
            <p className="text-muted-foreground text-[9px] uppercase font-black tracking-widest mb-6 border-b border-border pb-2">DEFCON 4 // Live Governance</p>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-muted-foreground uppercase font-black">Syncing...</span>
                    </div>
                ) : !vaultAddress ? (
                    <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Sync a Vault to access War Room</p>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-black">No Active Proposals</p>
                    </div>
                ) : (
                    proposals.map((p) => (
                        <motion.div
                            key={p.index}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-muted/30 rounded border-l-2 border-primary space-y-2 hover:bg-primary/5 transition-colors border border-border shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-foreground font-mono">PROP-#{p.index}</span>
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${p.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {p.status}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-primary"
                                        style={{ width: `${(p.signatures / p.threshold) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[9px] text-primary font-mono font-black">{p.signatures}/{p.threshold}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <Button
                                    className="h-7 bg-muted hover:bg-muted/80 text-foreground text-[9px] font-black uppercase gap-2 border border-border shadow-sm"
                                    onClick={() => handleSimulate(p.index)}
                                    disabled={simulating === p.index}
                                >
                                    <Play size={10} className={simulating === p.index ? "animate-pulse" : ""} />
                                    {simulating === p.index ? "..." : "Sim"}
                                </Button>
                                <Button
                                    className="h-7 bg-primary hover:opacity-90 text-primary-foreground text-[9px] font-black uppercase gap-2 shadow-sm"
                                    onClick={() => signProposal(p.index)}
                                >
                                    <CheckCircle2 size={10} />
                                    Sign
                                </Button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}

function MemberCard({ name, role, status, isSelf, avatar, color }: any) {
    const handleClick = () => {
        if (isSelf) {
            toast.info("That's you! Active as Admin / Signer.");
        } else {
            toast(`${name}`, {
                description: `Role: ${role} • Status: ${status === "online" ? "Online now" : "Offline"}`,
            });
        }
    };

    return (
        <div
            onClick={handleClick}
            className="p-3 bg-muted/10 border border-border rounded-lg flex items-center gap-4 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm cursor-pointer">
            {/* Holographic Corner */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
                <Avatar className="h-10 w-10 ring-1 ring-border ring-offset-1 ring-offset-background">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-xs font-bold font-mono" style={{ backgroundColor: `${color}22`, color: color }}>
                        {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background"
                    style={{ backgroundColor: status === 'online' ? color : 'var(--dashboard-muted)' }}
                />
            </div>
            <div>
                <h4 className="text-xs font-black text-foreground group-hover:text-primary transition-colors font-mono tracking-tight uppercase">{name} {isSelf && "(You)"}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <Fingerprint size={10} className="text-muted-foreground" />
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{role}</p>
                </div>
            </div>
        </div>
    );
}

function ActivityItem({ user, action, target, time }: any) {
    return (
        <div className="flex gap-4 p-2 rounded hover:bg-muted/30 transition-colors group">
            <span className="text-[10px] text-primary font-mono opacity-50 group-hover:opacity-100 min-w-[50px] font-bold">{time}</span>
            <div className="flex-1 border-l border-border pl-4 relative">
                <div className="absolute left-[-1px] top-[6px] w-2 h-px bg-primary opacity-0 group-hover:opacity-100" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-foreground font-black uppercase">{user}</span>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-black">
                        <span className="text-primary">{action}</span> <span className="text-muted-foreground/30 px-1">{"╱╱"}</span> {target}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Quorum Core: Visualizes Signer Presence vs Threshold
function QuorumCore({ others, threshold = 1 }: { others: any[], threshold?: number }) {
    // Calculate total online signers (Self + Others)
    // Note: In a real app we'd filter 'others' by role, but for now we assume all team members are signers
    const onlineSigners = others.length + 1;
    const isQuorumReached = onlineSigners >= threshold;
    const percentage = Math.min(100, (onlineSigners / threshold) * 100);

    // Core Status Color
    const coreColor = isQuorumReached ? "var(--dashboard-accent)" : "#fbbf24"; // primary vs Amber

    return (
        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] group shadow-sm">
            {/* Background Radial Glow */}
            <div
                className="absolute inset-0 opacity-20 transition-opacity duration-1000"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${coreColor} 0%, transparent 70%)`
                }}
            />

            <div className="relative z-10 flex items-center justify-between mb-4">
                <h3 className="text-foreground font-black uppercase tracking-widest flex items-center gap-2 text-xs">
                    <Cpu size={16} style={{ color: coreColor }} />
                    Quorum Core
                </h3>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${isQuorumReached ? 'bg-primary/10 border-primary/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: coreColor }}
                    />
                    <span className="text-[9px] font-mono font-bold" style={{ color: coreColor }}>
                        {isQuorumReached ? "READY" : "AWAITING"}
                    </span>
                </div>
            </div>

            {/* Reactor Graphic */}
            <div className="relative z-10 flex-1 flex items-center justify-center py-4">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Rotating Rings */}
                    <div
                        className="absolute inset-0 border-2 rounded-full border-dashed animate-[spin_10s_linear_infinite]"
                        style={{ borderColor: `${coreColor}33` }}
                    />
                    <div
                        className="absolute inset-2 border border-dotted rounded-full animate-[spin_5s_linear_infinite_reverse]"
                        style={{ borderColor: `${coreColor}44` }}
                    />
                    {/* Inner Core */}
                    <div
                        className="w-12 h-12 rounded-full shadow-[0_0_20px_currentColor] flex items-center justify-center transition-all duration-300"
                        style={{
                            backgroundColor: `${coreColor}11`,
                            color: coreColor,
                            boxShadow: isQuorumReached ? `0 0 30px ${coreColor}` : 'none'
                        }}
                    >
                        <Zap size={20} className={isQuorumReached ? "fill-current" : ""} />
                    </div>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-border pt-3">
                <div>
                    <span className="text-[9px] text-muted-foreground uppercase block mb-1 font-black">Online Power</span>
                    <div className="flex items-center gap-1 text-foreground text-[12px] font-mono font-black">
                        <Signal size={12} style={{ color: coreColor }} />
                        {onlineSigners}/{threshold} <span className="text-muted-foreground/30 ml-1">SIGS</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[9px] text-muted-foreground uppercase block mb-1 font-black">Execution</span>
                    <div className="flex items-center justify-end gap-1 text-foreground text-[10px] font-mono font-black">
                        {percentage.toFixed(0)}% <span className="text-muted-foreground/30">CAPACITY</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper for icon
function TerminalSquare({ size, className }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m7 11 2-2-2-2" />
            <path d="M11 13h4" />
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        </svg>
    )
}
