"use client";

import React, { useState } from "react";
import { useOthers, useSelf, useBroadcastEvent, useEventListener } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Shield, Zap, MessageSquare, Activity, Send, CheckCircle2, Play } from "lucide-react";
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
        <div className="flex-1 flex flex-col h-screen bg-[#0B0C10] overflow-hidden">
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

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0B0C10]">
                <div className="max-w-7xl mx-auto space-y-8">
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
                        {/* Main Grid: Team Members */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 glass-morphism">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-white font-bold uppercase tracking-tighter flex items-center gap-2">
                                        <Users size={16} className="text-[#36e27b]" />
                                        Active Operatives
                                    </h3>
                                    <div className="flex -space-x-2">
                                        <Avatar className="h-6 w-6 ring-2 ring-[#0B0C10]">
                                            <AvatarImage src={getAvatarUrl(self?.info?.name || "ME")} />
                                            <AvatarFallback>ME</AvatarFallback>
                                        </Avatar>
                                        {others.map(o => (
                                            <Avatar key={o.connectionId} className="h-6 w-6 ring-2 ring-[#0B0C10]">
                                                <AvatarImage src={getAvatarUrl(o.info?.name || "Collaborator")} />
                                                <AvatarFallback>?</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                            {/* Activity Log */}
                            <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 glass-morphism">
                                <h3 className="text-white font-bold mb-4 uppercase tracking-tighter flex items-center gap-2">
                                    <Activity size={16} className="text-[#36e27b]" />
                                    Command History
                                </h3>
                                <div className="space-y-4">
                                    <ActivityItem
                                        user="Neural Agent 01"
                                        action="SIMULATED TRANSACTION"
                                        target="Jupiter Swap: 10 SOL -> USDC"
                                        time="2 mins ago"
                                    />
                                    <ActivityItem
                                        user="You"
                                        action="UPDATED TREASURY"
                                        target="New Vault Linked"
                                        time="10 mins ago"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: Coordination */}
                        <div className="space-y-6">
                            <WarRoom vaultAddress={vaultAddress} />

                            {/* Collaborative Chat */}
                            <CollaborativeChat />

                            {/* Role Overview */}
                            <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 glass-morphism">
                                <h3 className="text-white font-bold mb-4 uppercase tracking-tighter">Permissions</h3>
                                <div className="space-y-3">
                                    <PermissionItem icon={Shield} label="Admin Control" active />
                                    <PermissionItem icon={Zap} label="Fast Execution" active />
                                    <PermissionItem icon={MessageSquare} label="Governance Voting" active />
                                </div>
                            </div>
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
        <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 glass-morphism border-l-4 border-[#36e27b] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse shadow-[0_0_8px_#36e27b]" />
            </div>

            <h3 className="text-white font-bold mb-2 uppercase tracking-tighter flex items-center gap-2">
                <Shield size={16} className="text-[#36e27b]" />
                War Room
            </h3>
            <p className="text-[#9eb7a8] text-[10px] uppercase font-bold tracking-widest mb-4">Live Governance Feed</p>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="w-8 h-8 border-2 border-[#36e27b] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-[#9eb7a8] uppercase font-black">Synchronizing Proposals...</span>
                    </div>
                ) : !vaultAddress ? (
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                        <p className="text-[10px] text-[#9eb7a8] uppercase font-black">Sync a Vault to access War Room</p>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                        <p className="text-[10px] text-[#9eb7a8] uppercase font-black">No active transactions at threshold</p>
                    </div>
                ) : (
                    proposals.map((p) => (
                        <motion.div
                            key={p.index}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-black/60 rounded-xl border border-[#36e27b]/20 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white">Proposal #{p.index}</span>
                                <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${p.status === 'Active' ? 'bg-[#36e27b]/20 text-[#36e27b]' : 'bg-white/5 text-[#9eb7a8]'}`}>
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
                                <span className="text-[10px] text-[#36e27b] font-bold">{p.signatures}/{p.threshold}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    className="h-8 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase gap-2"
                                    onClick={() => handleSimulate(p.index)}
                                    disabled={simulating === p.index}
                                >
                                    <Play size={10} className={simulating === p.index ? "animate-pulse" : ""} />
                                    {simulating === p.index ? "Running..." : "Simulate"}
                                </Button>
                                <Button
                                    className="h-8 bg-[#36e27b] hover:bg-[#25a85c] text-black text-[10px] font-bold uppercase gap-2"
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
        <div className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center gap-4 hover:border-[#36e27b]/30 transition-all group">
            <div className="relative">
                <Avatar className="h-10 w-10 ring-1 ring-white/10 ring-offset-2 ring-offset-[#0B0C10]">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: `${color}22`, color: color }}>
                        {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0B0C10]"
                    style={{ backgroundColor: status === 'online' ? color : '#3f3f46' }}
                />
            </div>
            <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#36e27b] transition-colors">{name} {isSelf && "(You)"}</h4>
                <p className="text-[10px] text-[#9eb7a8] uppercase tracking-tighter font-semibold">{role}</p>
            </div>
        </div>
    );
}

function ActivityItem({ user, action, target, time }: any) {
    return (
        <div className="flex gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] mt-1.5" />
            <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-white font-bold">{user}</span>
                    <span className="text-[9px] text-[#9eb7a8] uppercase font-black">{time}</span>
                </div>
                <p className="text-[10px] text-[#9eb7a8] uppercase tracking-tighter font-bold">
                    <span className="text-[#36e27b]">{action}</span> // {target}
                </p>
            </div>
        </div>
    );
}

function PermissionItem({ icon: Icon, label, active }: any) {
    return (
        <div className={`flex items-center justify-between p-2 rounded-lg ${active ? 'bg-[#36e27b]/5 border border-[#36e27b]/10' : 'opacity-40'}`}>
            <div className="flex items-center gap-2">
                <Icon size={12} className={active ? "text-[#36e27b]" : "text-[#9eb7a8]"} />
                <span className="text-[10px] font-bold text-white uppercase">{label}</span>
            </div>
            {active && <Zap size={10} className="text-[#36e27b] fill-[#36e27b]" />}
        </div>
    );
}
