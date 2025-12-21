"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    Activity,
    Zap,
    Users,
    Coins,
    History,
    X,
    ChevronRight,
    Terminal,
    Eye
} from "lucide-react";
import { useBroadcastEvent, useEventListener, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DispatchVector {
    id: string;
    name: string;
    recipients: number;
    totalAmount: string;
    status: "PENDING" | "EXECUTING" | "COMPLETED";
    timestamp: string;
}

const HISTORY: DispatchVector[] = [
    { id: "v_01", name: "CONTRIBUTOR_AIRDROP_Q4", recipients: 124, totalAmount: "50,000 USDC", status: "COMPLETED", timestamp: "2D_AGO" },
    { id: "v_02", name: "SECURITY_BOUNTY_REWARD", recipients: 12, totalAmount: "12,500 USDC", status: "COMPLETED", timestamp: "1W_AGO" },
];

export function OperationsNexus() {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [simulating, setSimulating] = useState(false);
    const [simData, setSimData] = useState<{ recipients: number; total: string; fee: string } | null>(null);
    const [remoteSim, setRemoteSim] = useState<{ user: string; data: any } | null>(null);

    const broadcast = useBroadcastEvent();
    const others = useOthers();

    // Filter others who are in the OPERATIONS module
    const othersInModule = others.filter(other => (other.presence as any)?.module === "OPERATIONS");

    useEventListener(({ event, user, connectionId }) => {
        if (event.type === "SIMULATION_RESULT") {
            setRemoteSim({ user: (user as any)?.info?.name || "Team Member", data: event.payload.result });
            // Auto-clear after 10s
            setTimeout(() => setRemoteSim(null), 10000);
        }
    });

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFile = (file: File) => {
        setSelectedFile(file);
        setSimulating(true);
        // Simulate parsing
        setTimeout(() => {
            const result = {
                recipients: Math.floor(Math.random() * 500) + 50,
                total: `${(Math.random() * 100000).toFixed(2)} USDC`,
                fee: "0.42 SOL"
            };
            setSimData(result);
            setSimulating(false);

            // Broadcast to team
            broadcast({
                type: "SIMULATION_RESULT",
                payload: { proposalId: 0, result }
            });
        }, 1500);
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2">Operations Center</h2>
                    <p className="text-muted-foreground text-sm italic font-mono uppercase tracking-widest text-xs opacity-60">KE_OS // DISPATCH_VECTOR_ACTIVE</p>
                </div>
                <div className="flex gap-2">
                    {/* Collaborative Status */}
                    <div className="flex -space-x-1.5 mr-4">
                        {othersInModule.map(other => (
                            <Avatar key={other.connectionId} className="h-6 w-6 ring-2 ring-background border border-border">
                                <AvatarImage src={other.info?.avatar} />
                                <AvatarFallback className="text-[6px]">{other.info?.name.substring(0, 1)}</AvatarFallback>
                            </Avatar>
                        ))}
                        {othersInModule.length > 0 && (
                            <div className="ml-3 flex items-center gap-2">
                                <Eye size={12} className="text-primary" />
                                <span className="text-[8px] font-black text-primary uppercase tracking-widest">{othersInModule.length} TEAM_ACTIVE</span>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 bg-muted border border-border rounded-xl flex items-center gap-3">
                        <Terminal size={14} className="text-primary" />
                        <span className="text-[10px] font-mono text-muted-foreground">LOG_LISTENER: OK</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 1. Main Dispatch Nexus (3 Columns) */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`relative min-h-[450px] rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-12 overflow-hidden ${dragActive
                            ? "bg-primary/10 border-primary scale-[1.01]"
                            : "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/30 shadow-inner"
                            }`}
                    >
                        {/* Tactical Background Grid */}
                        <div className="absolute inset-0 bg-[radial-gradient(#36e27b_1px,transparent_1px)] bg-[size:30px_30px] opacity-[0.03] pointer-events-none" />

                        <AnimatePresence mode="wait">
                            {!selectedFile ? (
                                <motion.div
                                    key="upload-prompt"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    className="text-center z-10"
                                >
                                    <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                                        <Upload className="text-primary" size={40} />
                                    </div>
                                    <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-2">Initiate Dispatch</h3>
                                    <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Drop your distribution CSV or JSON here to parse vectors and simulate gas impact.</p>
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className="px-8 py-3 bg-primary/10 border border-primary/20 rounded-2xl text-xs font-black text-primary uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer inline-block"
                                    >
                                        Select Source File
                                    </label>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="file-analysis"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full h-full flex flex-col gap-8 z-10"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                                                <FileText className="text-primary" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-foreground font-black text-sm uppercase tracking-widest">{selectedFile.name}</h4>
                                                <span className="text-[10px] text-muted-foreground font-mono">{(selectedFile.size / 1024).toFixed(2)} KB // RAW_DATA_SYNC</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedFile(null); setSimData(null); }}
                                            className="p-2 rounded-lg bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-6">
                                        {[
                                            { label: "Detected Recipients", val: simData?.recipients || "---", icon: Users, color: "var(--dashboard-accent)" },
                                            { label: "Dispatch Total", val: simData?.total || "---", icon: Coins, color: "var(--dashboard-accent)" },
                                            { label: "Estimated Vector Fee", val: simData?.fee || "---", icon: Zap, color: "#ff5b39" }
                                        ].map((stat, i) => (
                                            <div key={i} className="p-6 rounded-3xl bg-card border border-border flex flex-col gap-3 relative overflow-hidden group shadow-sm">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-current opacity-5 blur-2xl transition-opacity group-hover:opacity-10" style={{ color: stat.color }} />
                                                <stat.icon size={18} style={{ color: stat.color }} />
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">{stat.label}</span>
                                                    <span className="text-2xl font-mono font-black text-foreground">{simulating ? "SYNC..." : stat.val}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-auto flex gap-4">
                                        <button className="flex-1 py-4 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-50" disabled={simulating}>
                                            Execute Disbursement Vector
                                        </button>
                                        <button className="px-10 py-4 bg-muted border border-border text-foreground font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-muted/80 transition-colors shadow-sm">
                                            Stage Simulation
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Remote Simulation Notification */}
                        <AnimatePresence>
                            {remoteSim && !selectedFile && (
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="absolute bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-primary/30 flex items-center gap-4 z-50 shadow-2xl"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Zap size={20} className="animate-pulse" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{remoteSim.user} generated a simulation</span>
                                        <span className="text-xs font-mono text-muted-foreground">DATA: {remoteSim.data.recipients} Recipients // {remoteSim.data.total}</span>
                                    </div>
                                    <button
                                        onClick={() => setRemoteSim(null)}
                                        className="p-1 hover:text-foreground transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 2. Vector History (1 Column) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="flex-1 bg-card border border-border rounded-[2.5rem] p-6 flex flex-col shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <History size={20} />
                            </div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest text-[11px]">Vector History</h3>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                            {HISTORY.map((v) => (
                                <div key={v.id} className="p-4 rounded-2xl bg-muted/30 border border-border hover:border-primary/30 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-foreground uppercase truncate w-32 tracking-tighter">{v.name}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-muted-foreground font-mono italic">{v.totalAmount}</span>
                                            <span className="text-[9px] text-muted-foreground font-mono">{v.recipients} Recipients</span>
                                        </div>
                                        <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="mt-6 w-full py-3 bg-muted border border-border rounded-xl text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:bg-muted/80 transition-colors">
                            View All Distributions
                        </button>
                    </div>

                    <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-card border border-primary/20 flex flex-col gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Activity className="text-primary animate-pulse" size={18} />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Network_Throughput</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[8px] font-mono text-muted-foreground uppercase">
                                <span>Solana_Mainnet</span>
                                <span>2.4K TPS</span>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    animate={{ width: ["10%", "90%", "30%"] }}
                                    transition={{ duration: 5, repeat: Infinity }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: var(--dashboard-border);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: var(--dashboard-accent-muted);
                }
            `}</style>
        </div>
    );
}
