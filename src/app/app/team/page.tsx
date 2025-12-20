import React, { useState, useEffect } from "react";
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

export default function TeamPage() {
    const others = useOthers();
    const self = useSelf();
    const [vaultAddress, setVaultAddress] = useState("");

    return (
        <div className="flex-1 flex flex-col h-screen bg-[#0B0C10] overflow-hidden font-mono">
            {/* Team Header (Consolidated) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0C10]/50 backdrop-blur-md z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_#36e27b]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9eb7a8]">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Users className="text-[#36e27b]" size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-white uppercase">Team Workspace</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1F2833]/40 border border-white/5 hover:bg-white/5 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_rgba(54,226,123,0.5)]" />
                        <span className="text-xs font-medium text-white">Devnet</span>
                    </button>

                    <Suspense fallback={<div className="h-8 w-24 bg-white/5 animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-white/5 mx-1" />

                    <WalletButton />
                </div>
            </header>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0B0C10]">
                <div className="max-w-[1600px] mx-auto space-y-6">
                    {/* Compact Section Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[#9eb7a8] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#36e27b] animate-pulse" />
                                Collaborative Node active: {others.length + 1} Members Online
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Grid: Team Members & History */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* 1. Active Operatives (Polished Grid) */}
                            <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(54,226,123,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(54,226,123,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                                <div className="relative z-10 mb-6 flex items-center justify-between">
                                    <h3 className="text-white font-bold uppercase tracking-widest flex items-center gap-2 text-xs">
                                        <ScanFace size={16} className="text-[#36e27b]" />
                                        Active Operatives
                                    </h3>
                                    <div className="flex -space-x-2">
                                        <Avatar className="h-6 w-6 ring-2 ring-[#0B0C10] grayscale transition-all hover:grayscale-0">
                                            <AvatarImage src={getAvatarUrl(self?.info?.name || "ME")} />
                                            <AvatarFallback>ME</AvatarFallback>
                                        </Avatar>
                                        {others.map(o => (
                                            <Avatar key={o.connectionId} className="h-6 w-6 ring-2 ring-[#0B0C10] grayscale transition-all hover:grayscale-0">
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
                                        color="#36e27b"
                                    />

                                    {/* Live Others */}
                                    {others.map(({ connectionId, info }) => (
                                        <MemberCard
                                            key={connectionId}
                                            name={info?.name || "Collaborator"}
                                            role="Operator"
                                            status="online"
                                            avatar={getAvatarUrl(info?.name || "Collaborator")}
                                            color={info?.color || "#36e27b"}
                                        />
                                    ))}

                                    {/* Mocked offline members for UI density */}
                                    <MemberCard
                                        name="Neural Agent 01"
                                        role="Automated Auditor"
                                        status="offline"
                                        avatar={getAvatarUrl("Neural Agent 01")}
                                        color="#9eb7a8"
                                    />
                                </div>
                            </div>

                            {/* 2. Command History (Terminal Style) */}
                            <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-0 overflow-hidden flex flex-col min-h-[300px]">
                                <div className="p-4 border-b border-white/5 bg-[#0B0C10]/50 flex items-center justify-between">
                                    <h3 className="text-white font-bold uppercase tracking-widest flex items-center gap-2 text-xs">
                                        <TerminalSquare size={16} className="text-[#36e27b]" />
                                        Tactical Log
                                    </h3>
                                    <span className="text-[10px] text-[#9eb7a8] font-mono">LIVE FEED // AES-256</span>
                                </div>
                                <div className="p-4 space-y-2 font-mono text-xs flex-1">
                                    <ActivityItem
                                        user="Neural Agent 01"
                                        action="SIMULATED TRANSACTION"
                                        target="Jupiter Swap: 10 SOL -> USDC"
                                        time="02:42:12"
                                    />
                                    <ActivityItem
                                        user="You"
                                        action="UPDATED TREASURY"
                                        target="New Vault Linked"
                                        time="02:30:05"
                                    />
                                    <ActivityItem
                                        user="Neural Agent 01"
                                        action="RISK SCAN"
                                        target="Liquidity Check: PASSED"
                                        time="02:15:00"
                                    />
                                    <div className="flex items-center gap-2 opacity-50 pt-2">
                                        <span className="text-[#36e27b] animate-pulse">_</span>
                                        <span className="italic text-[#9eb7a8]">Awaiting new signals...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: War Room & Neural Uplink */}
                        <div className="space-y-6">
                            <WarRoom vaultAddress={vaultAddress} />

                            {/* Collaborative Chat */}
                            <CollaborativeChat />

                            {/* Neural Uplink (Replaces Permissions) */}
                            <NeuralUplink />
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
                message: `🔬 Team Broadcast: Simulation for Proposal #${event.payload.proposalId} resulted in SUCCESS. Net change: +0.4 SOL`,
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
                message: "🔬 Simulation complete. Results broadcast to team.",
            });
        }, 2000);
    };

    return (
        <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            {/* Diagonal Stripes Warning Pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#36e27b,#36e27b_10px,transparent_10px,transparent_20px)] opacity-50" />

            <div className="absolute top-4 right-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse shadow-[0_0_8px_#36e27b]" />
            </div>

            <h3 className="text-white font-bold mb-1 uppercase tracking-widest flex items-center gap-2 text-xs">
                <Siren size={16} className="text-[#36e27b]" />
                War Room
            </h3>
            <p className="text-[#9eb7a8] text-[9px] uppercase font-bold tracking-widest mb-6 border-b border-white/5 pb-2">DEFCON 4 // Live Governance</p>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="w-8 h-8 border-2 border-[#36e27b] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-[#9eb7a8] uppercase font-black">Syncing...</span>
                    </div>
                ) : !vaultAddress ? (
                    <div className="p-4 bg-black/40 rounded-xl border border-dashed border-white/10 text-center">
                        <p className="text-[10px] text-[#9eb7a8] uppercase font-black">Sync a Vault to access War Room</p>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="p-4 bg-black/40 rounded-xl border border-dashed border-white/10 text-center">
                        <p className="text-[10px] text-[#9eb7a8] uppercase font-black">No Active Proposals</p>
                    </div>
                ) : (
                    proposals.map((p) => (
                        <motion.div
                            key={p.index}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-black/60 rounded border-l-2 border-[#36e27b] space-y-2 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white font-mono">PROP-#{p.index}</span>
                                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${p.status === 'Active' ? 'bg-[#36e27b]/20 text-[#36e27b]' : 'bg-white/5 text-[#9eb7a8]'}`}>
                                    {p.status}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#36e27b]"
                                        style={{ width: `${(p.signatures / p.threshold) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[9px] text-[#36e27b] font-mono">{p.signatures}/{p.threshold}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <Button
                                    className="h-7 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase gap-2 border border-white/5"
                                    onClick={() => handleSimulate(p.index)}
                                    disabled={simulating === p.index}
                                >
                                    <Play size={10} className={simulating === p.index ? "animate-pulse" : ""} />
                                    {simulating === p.index ? "..." : "Sim"}
                                </Button>
                                <Button
                                    className="h-7 bg-[#36e27b] hover:bg-[#25a85c] text-black text-[9px] font-bold uppercase gap-2"
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
    return (
        <div className="p-3 bg-black/40 border border-white/5 rounded-lg flex items-center gap-4 hover:border-[#36e27b]/50 transition-all group relative overflow-hidden">
            {/* Holographic Corner */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[#36e27b]/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
                <Avatar className="h-10 w-10 ring-1 ring-white/10 ring-offset-1 ring-offset-[#0B0C10]">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-xs font-bold font-mono" style={{ backgroundColor: `${color}22`, color: color }}>
                        {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0B0C10]"
                    style={{ backgroundColor: status === 'online' ? color : '#3f3f46' }}
                />
            </div>
            <div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#36e27b] transition-colors font-mono tracking-tight">{name} {isSelf && "(You)"}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <Fingerprint size={10} className="text-[#9eb7a8]" />
                    <p className="text-[9px] text-[#9eb7a8] uppercase tracking-wider font-semibold">{role}</p>
                </div>
            </div>
        </div>
    );
}

function ActivityItem({ user, action, target, time }: any) {
    return (
        <div className="flex gap-4 p-2 rounded hover:bg-white/5 transition-colors group">
            <span className="text-[10px] text-[#36e27b] font-mono opacity-50 group-hover:opacity-100 min-w-[50px]">{time}</span>
            <div className="flex-1 border-l border-white/5 pl-4 relative">
                <div className="absolute left-[-1px] top-[6px] w-2 h-px bg-[#36e27b] opacity-0 group-hover:opacity-100" />
                <div className="flex flex-col">
                    <span className="text-[10px] text-white font-bold">{user}</span>
                    <p className="text-[10px] text-[#9eb7a8] uppercase tracking-tight">
                        <span className="text-[#36e27b] font-bold">{action}</span> <span className="text-white/30 px-1">//</span> {target}
                    </p>
                </div>
            </div>
        </div>
    );
}

function NeuralUplink() {
    const [latency, setLatency] = useState(12);

    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(prev => Math.max(8, Math.min(45, prev + (Math.random() * 10 - 5))));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="flex items-center justify-between mb-4 z-10">
                <h3 className="text-white font-bold uppercase tracking-widest flex items-center gap-2 text-xs">
                    <Radio size={16} className="text-[#36e27b]" />
                    Neural Uplink
                </h3>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse" />
                    <span className="text-[9px] font-mono text-[#36e27b]">CONNECTED</span>
                </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-1 h-12 mb-4 opacity-50">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="w-full bg-[#36e27b]"
                        style={{
                            height: `${Math.random() * 100}%`,
                            animation: `pulse 0.5s infinite ${i * 0.05}s`
                        }}
                    />
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 z-10 border-t border-white/5 pt-3">
                <div>
                    <span className="text-[9px] text-[#9eb7a8] uppercase block mb-1">Encryption</span>
                    <div className="flex items-center gap-1 text-white text-[10px] font-mono font-bold">
                        <Lock size={10} className="text-[#36e27b]" />
                        AES-256-GCM
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[9px] text-[#9eb7a8] uppercase block mb-1">Latency</span>
                    <div className="flex items-center justify-end gap-1 text-white text-[10px] font-mono font-bold">
                        <Wifi size={10} className="text-[#36e27b]" />
                        {latency.toFixed(0)}ms
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
