"use client";

import React, { useState, useMemo } from "react";
import { Download, FileText, Search, CheckCircle2, XCircle, ExternalLink, Inbox, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { useVault } from "@/lib/contexts/VaultContext";

function formatDate(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
    });
}

function formatTime(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleTimeString(undefined, {
        hour: "2-digit", minute: "2-digit",
    });
}

export function DataNexus() {
    const { recentTransactions, activeVault, loading, refresh } = useVault();
    const [searchQuery, setSearchQuery] = useState("");

    // Filter transactions by search query (signature, type, token, memo)
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return recentTransactions;
        const q = searchQuery.toLowerCase();
        return recentTransactions.filter((tx: any) =>
            tx.signature?.toLowerCase().includes(q) ||
            tx.type?.toLowerCase().includes(q) ||
            tx.token?.toLowerCase().includes(q) ||
            tx.memo?.toLowerCase().includes(q)
        );
    }, [recentTransactions, searchQuery]);

    const handleExportCsv = () => {
        if (filtered.length === 0) {
            toast.error("No transactions to export");
            return;
        }
        const header = "Signature,Date,Time,Type,Amount,Token,Status,Memo,Slot";
        const rows = filtered.map((tx: any) => {
            const date = tx.blockTime ? formatDate(tx.blockTime) : "";
            const time = tx.blockTime ? formatTime(tx.blockTime) : "";
            return `${tx.signature},${date},${time},${tx.type || ""},${tx.amount || ""},${tx.token || ""},${tx.success ? "Success" : "Failed"},${tx.memo || ""},${tx.slot}`;
        });
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `dreyv-ledger-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${filtered.length} transactions as CSV`);
    };

    const handleReport = () => {
        if (filtered.length === 0) {
            toast.error("No transactions for report");
            return;
        }
        const lines = filtered.map((tx: any) => {
            const date = tx.blockTime ? `${formatDate(tx.blockTime)} ${formatTime(tx.blockTime)}` : "Unknown";
            const amount = tx.amount && tx.token ? `${tx.amount} ${tx.token}` : "—";
            return `[${date}] ${tx.type || "Transaction"} | ${amount} | ${tx.success ? "OK" : "FAILED"} | ${tx.signature}`;
        });
        const vault = activeVault || "unknown";
        const blob = new Blob([
            `dreyv Treasury - Transaction Report\n`,
            `Vault: ${vault}\n`,
            `Generated: ${new Date().toISOString()}\n`,
            `Transactions: ${filtered.length}\n`,
            `${'─'.repeat(80)}\n\n`,
            lines.join("\n"),
        ], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `dreyv-report-${Date.now()}.txt`; a.click();
        URL.revokeObjectURL(url);
        toast.success("Report generated");
    };

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 pt-2">
                <div className="flex gap-2">
                    <button onClick={handleReport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">
                        <FileText size={14} /> Report
                    </button>
                    <div className="h-8 w-px bg-border mx-1" />
                    <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-medium text-primary hover:text-primary/80 transition-all">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
                <button
                    onClick={() => refresh()}
                    disabled={loading}
                    className="p-2 rounded-lg bg-muted border border-border hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Ledger */}
            <div className="flex-1 flex flex-col overflow-hidden relative border-t border-border mt-2">
                <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${recentTransactions.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                        <span className="text-[9px] font-medium text-muted-foreground">
                            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
                            {searchQuery && ` matching "${searchQuery}"`}
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={10} />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-7 w-48 bg-muted border border-border rounded pl-7 pr-2 text-[9px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 transition-colors"
                            placeholder="Search signature, type..."
                        />
                    </div>
                </div>

                {!activeVault ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <Inbox size={24} className="text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">Connect an address to view the ledger</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <FileText size={24} className="text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">
                            {loading ? "Loading transactions..." : searchQuery ? "No matching transactions" : "No transactions found"}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto scrollbar-thin font-mono">
                        <div className="min-w-[800px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border">
                                        <th className="py-2 pl-4 font-normal">Signature</th>
                                        <th className="py-2 font-normal">Date</th>
                                        <th className="py-2 font-normal">Type</th>
                                        <th className="py-2 font-normal">Amount</th>
                                        <th className="py-2 font-normal">Status</th>
                                        <th className="py-2 font-normal">Slot</th>
                                        <th className="py-2 font-normal pr-4 text-right">Explorer</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] text-muted-foreground">
                                    {filtered.map((tx: any) => (
                                        <tr key={tx.signature} className="group hover:bg-muted/30 transition-colors">
                                            <td className="py-3 pl-4 border-b border-border/50 text-foreground font-bold">
                                                {tx.signature.slice(0, 12)}...{tx.signature.slice(-4)}
                                            </td>
                                            <td className="py-3 border-b border-border/50">
                                                {tx.blockTime ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-foreground">{formatDate(tx.blockTime)}</span>
                                                        <span className="text-[8px] text-muted-foreground">{formatTime(tx.blockTime)}</span>
                                                    </div>
                                                ) : "—"}
                                            </td>
                                            <td className="py-3 border-b border-border/50">
                                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                    tx.type === "Transfer" ? "bg-primary/10 text-primary" :
                                                    tx.type === "Swap" ? "bg-emerald-500/10 text-emerald-500" :
                                                    tx.type === "Multisig Action" ? "bg-orange-500/10 text-orange-500" :
                                                    "bg-muted text-muted-foreground"
                                                }`}>
                                                    {tx.type || "Transaction"}
                                                </span>
                                            </td>
                                            <td className="py-3 border-b border-border/50 font-bold text-foreground">
                                                {tx.amount && tx.token ? `${tx.amount} ${tx.token}` : "—"}
                                            </td>
                                            <td className="py-3 border-b border-border/50">
                                                <div className="flex items-center gap-1.5">
                                                    {tx.success ? (
                                                        <><CheckCircle2 size={10} className="text-emerald-500" /><span className="text-emerald-500">Success</span></>
                                                    ) : (
                                                        <><XCircle size={10} className="text-destructive" /><span className="text-destructive">Failed</span></>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 border-b border-border/50 text-muted-foreground">
                                                {tx.slot?.toLocaleString()}
                                            </td>
                                            <td className="py-3 border-b border-border/50 pr-4 text-right">
                                                <button
                                                    onClick={() => window.open(`https://explorer.solana.com/tx/${tx.signature}`, "_blank")}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                                >
                                                    <ExternalLink size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

