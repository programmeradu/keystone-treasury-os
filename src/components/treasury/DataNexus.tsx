"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    Database,
    ShieldCheck,
    FileJson,
    FileText,
    Search,
    Filter,
    Download,
    BarChart,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Users,
    Zap
} from "lucide-react";
import { useUpdateMyPresence, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Transaction {
    id: string;
    to: string;
    amount: string;
    category: string;
    status: "RECONCILED" | "UNRECONCILED";
    compliance: "SECURE" | "FLAGGED";
}

const TXS: Transaction[] = [
    { id: "tx_0a1", to: "Zebec_Stream_Pulp", amount: "1,200 USDC", category: "PAYROLL", status: "RECONCILED", compliance: "SECURE" },
    { id: "tx_0b2", to: "Unknown_Wallet_0x...f2", amount: "50,000 USDC", category: "UNCATEGORIZED", status: "UNRECONCILED", compliance: "FLAGGED" },
    { id: "tx_0c3", to: "AWS_Infrastructure", amount: "240.21 USDC", category: "INFRA", status: "RECONCILED", compliance: "SECURE" },
];

export function DataNexus() {
    const updatePresence = useUpdateMyPresence();
    const others = useOthers();
    const [focusedTx, setFocusedTx] = useState<string | null>(null);

    const handleTxFocus = (txId: string | null) => {
        setFocusedTx(txId);
        updatePresence({ selectedTxId: txId } as any);
    };

    const othersInModule = others.filter(other => (other.presence as any)?.module === "DATA");

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2">Data Nexus</h2>
                    <p className="text-muted-foreground text-sm italic font-mono uppercase tracking-widest text-xs opacity-60">KE_OS // TREASURY_INTELLIGENCE_LAYER</p>
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
                            <span className="ml-3 text-[8px] font-black text-primary uppercase tracking-widest">{othersInModule.length} AUDITORS_LOGGED_IN</span>
                        )}
                    </div>

                    <button className="px-6 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-primary/20">
                        <Download size={16} />
                        Export Reports
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 1. Accounting HUD (1 Column) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-card border border-primary/20 flex flex-col gap-6 relative overflow-hidden group shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Database size={80} className="text-primary" />
                        </div>

                        <div className="relative z-10 flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Reconciliation Score</span>
                            <span className="text-4xl font-black text-foreground tracking-tighter">98.4%</span>
                        </div>

                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex justify-between text-[8px] font-mono text-muted-foreground uppercase">
                                <span>Uncategorized</span>
                                <span>12 Transactions</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full w-[98%] bg-primary shadow-[0_0_10px_var(--dashboard-accent-muted)]" />
                            </div>
                        </div>

                        <button className="relative z-10 w-full py-4 bg-muted border border-border rounded-2xl text-[10px] font-black text-foreground uppercase tracking-[0.2em] hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 shadow-sm">
                            <RefreshCw size={14} className="text-primary" />
                            Auto-Categorize
                        </button>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-card border border-border flex flex-col gap-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="text-primary" size={18} />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Compliance Monitor</span>
                        </div>
                        <div className="flex flex-col gap-4">
                            {[
                                { label: "OFAC_Screening", status: "ACTIVE", color: "var(--dashboard-accent)" },
                                { label: "AML_Heuristics", status: "ACTIVE", color: "var(--dashboard-accent)" },
                                { label: "Risk_Level", status: "LOW", color: "var(--dashboard-accent)" }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-muted/30 border border-border">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">{item.label}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: item.color }}>{item.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Transaction Feed & Ingestion (3 Columns) */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-8 bg-card border border-border rounded-[2.5rem] flex flex-col gap-4 hover:border-primary/50 transition-all cursor-pointer group shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-1">Ingest CSV/PDF</h3>
                                <p className="text-[10px] text-muted-foreground font-mono">Drag and drop transaction logs for auto-reconciliation.</p>
                            </div>
                        </div>
                        <div className="p-8 bg-card border border-border rounded-[2.5rem] flex flex-col gap-4 hover:border-blue-500/50 transition-all cursor-pointer group shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
                                <FileJson size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-1">Integrate ERP</h3>
                                <p className="text-[10px] text-muted-foreground font-mono">Sync with QuickBooks, Bitwave, or TRES.finance via API.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-card border border-border rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <BarChart size={20} />
                                </div>
                                <h3 className="text-sm font-black text-foreground uppercase tracking-widest text-[11px]">Intelligence Feed</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                                    <input
                                        type="text"
                                        placeholder="SEARCH_LOGS..."
                                        className="bg-muted border border-border rounded-full py-1.5 pl-9 pr-4 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 w-48 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    />
                                </div>
                                <button className="p-2 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground shadow-sm">
                                    <Filter size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {TXS.map((tx) => {
                                const auditor = othersInModule.find(o => (o.presence as any)?.selectedTxId === tx.id);

                                return (
                                    <div
                                        key={tx.id}
                                        onMouseEnter={() => handleTxFocus(tx.id)}
                                        onMouseLeave={() => handleTxFocus(null)}
                                        className={`p-6 rounded-[2rem] bg-background border transition-all relative group shadow-sm ${auditor ? "border-primary/50 shadow-[0_0_15px_var(--dashboard-accent-muted)]" : "border-border hover:border-primary/20"
                                            }`}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-1 h-8 rounded-full ${tx.compliance === "SECURE" ? "bg-primary" : "bg-destructive"} shadow-[0_0_8px_currentColor]`} />
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold text-foreground uppercase tracking-tighter">{tx.to}</span>
                                                    {tx.compliance === "FLAGGED" && (
                                                        <span className="flex items-center gap-1 text-[7px] font-black text-destructive bg-destructive/10 px-1.5 py-0.5 rounded uppercase border border-destructive/20">
                                                            <AlertCircle size={8} />
                                                            Risk_ Detected
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground/50 uppercase">
                                                    <span>{tx.id}</span>
                                                    <span>{tx.category}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 ml-auto">
                                            {auditor && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/30">
                                                    <span className="text-[7px] font-black text-primary uppercase tracking-widest">{auditor.info?.name} Auditing</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-12">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-black text-foreground font-mono">{tx.amount}</span>
                                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">Disbursement</span>
                                                </div>
                                                <div className="w-24">
                                                    <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-widest shadow-sm ${tx.status === "RECONCILED"
                                                        ? "bg-primary/10 border-primary/20 text-primary"
                                                        : "bg-muted border-border text-muted-foreground/50"
                                                        }`}>
                                                        {tx.status === "RECONCILED" && <CheckCircle2 size={10} />}
                                                        {tx.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
