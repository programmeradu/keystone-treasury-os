"use client";

import React, { useRef, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from "framer-motion";
import { FileText, ExternalLink, RefreshCw, ShieldCheck, Clock, CheckCircle2, XCircle, Ban, Inbox, Eye, Users, ArrowUpRight } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useVault } from "@/lib/contexts/VaultContext";

interface Proposal {
    index: number;
    title: string;
    status: string;
    signatures: number;
    threshold: number;
    pda: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string; icon: typeof Clock; critical: boolean }> = {
    Active:      { label: "Pending",   color: "text-amber-500",         dotColor: "bg-amber-500", icon: Clock,        critical: true },
    Approved:    { label: "Approved",  color: "text-primary",           dotColor: "bg-primary",   icon: CheckCircle2, critical: false },
    Executed:    { label: "Executed",  color: "text-primary",           dotColor: "bg-primary",   icon: ShieldCheck,  critical: false },
    Rejected:    { label: "Rejected",  color: "text-destructive",       dotColor: "bg-destructive", icon: XCircle,   critical: false },
    Cancelled:   { label: "Cancelled", color: "text-muted-foreground",  dotColor: "bg-muted-foreground", icon: Ban,  critical: false },
};

export function DirectiveHub() {
    const { theme } = useTheme();
    const { proposals, activeVault, loading, refresh, isMultisig } = useVault();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [refreshing, setRefreshing] = useState(false);

    const handleMouseMove = useCallback(({ currentTarget, clientX, clientY }: React.MouseEvent) => {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }, [mouseX, mouseY]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }, [refresh]);

    const holographicBackground = useMotionTemplate`
        radial-gradient(
            400px circle at ${mouseX}px ${mouseY}px,
            ${theme === 'light' ? 'rgba(22, 163, 74, 0.06)' : 'rgba(54, 226, 123, 0.06)'},
            transparent 80%
        )
    `;

    const activeCount = useMemo(() =>
        proposals.filter((p: Proposal) => p.status === "Active").length
    , [proposals]);

    const statusLine = useMemo(() => {
        if (!activeVault) return "No address linked";
        if (loading) return "Syncing...";
        if (!isMultisig) return "Observer mode";
        if (proposals.length === 0) return "No proposals";
        return activeCount > 0 ? `${activeCount} pending` : "All resolved";
    }, [activeVault, loading, proposals.length, activeCount, isMultisig]);

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col h-full group/hub relative shadow-sm"
        >
            {/* Subtle Mouse Glow */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-0"
                style={{ background: holographicBackground }}
            />

            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex justify-between items-center z-10">
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isMultisig ? "bg-primary/10 border border-primary/20" : "bg-muted border border-border"
                    }`}>
                        {isMultisig ? <FileText className="text-primary" size={14} /> : <Eye className="text-muted-foreground" size={14} />}
                    </div>
                    <div>
                        <h2 className="text-foreground font-semibold text-xs leading-none mb-0.5">
                            {isMultisig ? "Proposals" : "Governance"}
                        </h2>
                        <span className={`text-[10px] ${activeCount > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                            {statusLine}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeVault && (
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing || loading}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-40"
                            aria-label="Refresh proposals"
                        >
                            <RefreshCw size={12} className={`text-muted-foreground ${refreshing || loading ? "animate-spin" : ""}`} />
                        </button>
                    )}
                    {proposals.length > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                            {proposals.length} total
                        </span>
                    )}
                </div>
            </div>

            {/* Proposals List */}
            <div className="p-3 flex flex-col gap-2 overflow-y-auto flex-1 z-10">
                <AnimatePresence mode="wait">
                    {!activeVault ? (
                        <motion.div
                            key="no-vault"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center"
                        >
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <Inbox size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">No address connected</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">Paste any Solana address to get started</p>
                            </div>
                        </motion.div>
                    ) : !isMultisig ? (
                        <motion.div
                            key="observer"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center gap-3 py-8 px-4 text-center"
                        >
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <Eye size={18} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-foreground">Observer mode</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed">
                                    You&apos;re viewing a standard wallet. Upgrade to a
                                    <br />Squads multisig to unlock team governance.
                                </p>
                            </div>
                            <button
                                onClick={() => window.open("https://app.squads.so/create-squad", "_blank")}
                                className="mt-1 px-3 py-1.5 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-primary"
                            >
                                <Users size={12} />
                                <span className="text-[10px] font-medium">Create a Squad</span>
                                <ArrowUpRight size={10} />
                            </button>
                        </motion.div>
                    ) : proposals.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <ShieldCheck size={18} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground">All clear</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1">No recent proposals found</p>
                            </div>
                        </motion.div>
                    ) : (
                        proposals.map((proposal: Proposal, index: number) => {
                            const config = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.Active;
                            const sigProgress = Math.round((proposal.signatures / proposal.threshold) * 100);
                            const StatusIcon = config.icon;

                            return (
                                <motion.div
                                    key={proposal.pda}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div
                                        className="bg-background border border-border rounded-xl p-3.5 transition-colors hover:border-primary/30 cursor-pointer group/card"
                                        onClick={() => window.open(`https://explorer.solana.com/address/${proposal.pda}`, "_blank")}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`${proposal.title} — ${config.label} — ${proposal.signatures} of ${proposal.threshold} signatures`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Proposal #{proposal.index}
                                                </span>
                                                {config.critical && (
                                                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-medium text-amber-500">
                                                        Needs signature
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${config.critical ? "animate-pulse" : ""}`} />
                                                <span className={`text-[10px] font-medium ${config.color}`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground mb-2.5">
                                            {proposal.signatures} of {proposal.threshold} signatures
                                        </p>

                                        {/* Signature Progress */}
                                        <div className="relative h-1 w-full bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                className={`absolute h-full rounded-full ${config.critical ? "bg-amber-500" : "bg-primary"}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${sigProgress}%` }}
                                                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            {activeVault && isMultisig && (
                <div className="px-4 py-3 border-t border-border z-10">
                    <button
                        onClick={() => window.open(`https://app.squads.so/squads/${activeVault}`, "_blank")}
                        className="w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Open vault in Squads"
                    >
                        <ExternalLink size={12} />
                        <span className="text-[11px] font-medium">View on Squads</span>
                    </button>
                </div>
            )}
        </div>
    );
}
