"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ExternalLink, Inbox, Activity, ArrowUpRight, ArrowDownLeft, Repeat, XCircle } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";

function formatTimeAgo(unixSeconds: number): string {
    const diff = Math.floor(Date.now() / 1000) - unixSeconds;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function txIcon(type?: string) {
    switch (type?.toLowerCase()) {
        case "transfer": return <ArrowUpRight size={12} />;
        case "receive": return <ArrowDownLeft size={12} />;
        case "swap": return <Repeat size={12} />;
        default: return <Activity size={12} />;
    }
}

export function StreamingVelocity() {
    const { recentTransactions, loading, refresh, activeVault, vaultTokens, vaultValue } = useVault();
    const [timeFilter, setTimeFilter] = useState<"7D" | "30D">("7D");

    // Compute real metrics from transaction data
    const metrics = useMemo(() => {
        const total = recentTransactions.length;
        const successful = recentTransactions.filter((t: any) => t.success).length;
        const failed = total - successful;

        // Count transactions with parsed transfer info
        const transfers = recentTransactions.filter((t: any) => t.type === "Transfer").length;
        const swaps = recentTransactions.filter((t: any) => t.type === "Swap").length;

        return [
            { label: "Transactions", val: String(total), sub: `${successful} successful` },
            { label: "Assets", val: String(vaultTokens?.length || 0), sub: vaultValue ? `$${vaultValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total` : "syncing..." },
            { label: "Transfers", val: String(transfers), sub: `${swaps} swaps` },
            { label: "Failed", val: String(failed), sub: failed === 0 ? "all clear" : "review needed" },
        ];
    }, [recentTransactions, vaultTokens, vaultValue]);

    // Bucket transactions into time slots for the chart
    const chartBars = useMemo(() => {
        const now = Math.floor(Date.now() / 1000);
        const windowSeconds = timeFilter === "7D" ? 7 * 86400 : 30 * 86400;
        const bucketCount = timeFilter === "7D" ? 28 : 30; // 4 bars per day (7D) or 1 bar per day (30D)
        const bucketSize = windowSeconds / bucketCount;
        const cutoff = now - windowSeconds;

        const buckets = Array.from({ length: bucketCount }, () => 0);

        for (const tx of recentTransactions) {
            if (!tx.blockTime || tx.blockTime < cutoff) continue;
            const bucketIdx = Math.floor((tx.blockTime - cutoff) / bucketSize);
            if (bucketIdx >= 0 && bucketIdx < bucketCount) {
                buckets[bucketIdx]++;
            }
        }

        const maxCount = Math.max(1, ...buckets);
        return buckets.map((count, i) => ({
            count,
            height: Math.max(5, (count / maxCount) * 100), // min 5% for visibility
            time: new Date((cutoff + (i + 0.5) * bucketSize) * 1000),
        }));
    }, [recentTransactions, timeFilter]);

    // Recent transactions for the list (most recent 10)
    const recentList = useMemo(() => {
        return recentTransactions
            .filter((t: any) => t.blockTime)
            .slice(0, 10);
    }, [recentTransactions]);

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Header Metrics — real data */}
            <div className="flex flex-col xl:flex-row gap-2 h-auto shrink-0">
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {metrics.map((m, i) => (
                        <div key={i} className="px-4 py-2 rounded-lg bg-card border border-border flex items-center justify-between group hover:border-primary/20 transition-colors">
                            <span className="text-[9px] font-medium text-muted-foreground truncate">{m.label}</span>
                            <div className="text-right">
                                <span className="text-sm font-mono font-bold text-foreground block leading-none">{m.val}</span>
                                <span className="text-[8px] font-mono text-primary leading-none">{m.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transaction Activity Chart — real bucketed data */}
            <div className="flex-1 rounded-xl bg-card/50 border border-border relative overflow-hidden flex flex-col p-4">
                <div className="relative z-10 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xs font-semibold text-foreground">Transaction Activity</h3>
                        <p className="text-[9px] text-muted-foreground">{recentTransactions.length} transactions</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => refresh()}
                            disabled={loading}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        </button>
                        <div className="flex gap-1">
                            <button onClick={() => setTimeFilter("7D")} className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${timeFilter === "7D" ? "bg-primary/20 text-primary border-primary/20" : "bg-muted text-foreground border-border"}`}>7D</button>
                            <button onClick={() => setTimeFilter("30D")} className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${timeFilter === "30D" ? "bg-primary/20 text-primary border-primary/20" : "bg-muted text-foreground border-border"}`}>30D</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full relative flex items-end gap-0.5 pb-0 overflow-hidden">
                    {!activeVault ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-[10px] text-muted-foreground">Connect an address to see activity</p>
                        </div>
                    ) : chartBars.every(b => b.count === 0) ? (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-[10px] text-muted-foreground">{loading ? "Loading transactions..." : "No transactions in this period"}</p>
                        </div>
                    ) : (
                        chartBars.map((bar, i) => (
                            <motion.div
                                key={`${timeFilter}-${i}`}
                                initial={{ height: 0 }}
                                animate={{ height: `${bar.height}%` }}
                                transition={{ duration: 0.4, delay: i * 0.01 }}
                                className={`flex-1 min-w-[4px] rounded-t-sm hover:opacity-100 transition-opacity cursor-crosshair group relative ${
                                    bar.count > 0 ? "bg-gradient-to-t from-primary/5 to-primary opacity-60" : "bg-muted/30 opacity-30"
                                }`}
                            >
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-card border border-border text-[8px] text-foreground opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none">
                                    {bar.count} tx{bar.count !== 1 ? "s" : ""} · {bar.time.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </div>
                            </motion.div>
                        ))
                    )}

                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                        <div className="w-full h-px border-t border-muted-foreground border-dashed" />
                        <div className="w-full h-px border-t border-muted-foreground border-dashed" />
                        <div className="w-full h-px border-t border-muted-foreground border-dashed" />
                    </div>
                </div>
            </div>

            {/* Recent Transactions — real on-chain data */}
            <div className="h-56 overflow-hidden relative flex flex-col">
                <div className="px-4 py-2 border-b border-border flex justify-between items-center">
                    <span className="text-[9px] font-semibold text-muted-foreground">Recent Transactions</span>
                    {activeVault && (
                        <button
                            onClick={() => window.open(`https://explorer.solana.com/address/${activeVault}`, "_blank")}
                            className="text-[9px] font-medium text-primary hover:text-foreground transition-colors flex items-center gap-1"
                        >
                            View on Explorer <ExternalLink size={8} />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-auto p-2 scrollbar-thin">
                    {!activeVault ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2">
                            <Inbox size={18} className="text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground">No address connected</p>
                        </div>
                    ) : recentList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-2">
                            <Activity size={18} className="text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground">{loading ? "Loading..." : "No recent transactions"}</p>
                        </div>
                    ) : (
                        recentList.map((tx: any) => (
                            <div
                                key={tx.signature}
                                onClick={() => window.open(`https://explorer.solana.com/tx/${tx.signature}`, "_blank")}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer border border-transparent hover:border-border gap-3"
                            >
                                <div className="flex items-center gap-3 w-full">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                        tx.success ? "bg-muted text-primary group-hover:bg-primary group-hover:text-primary-foreground" : "bg-destructive/10 text-destructive"
                                    } transition-colors`}>
                                        {txIcon(tx.type)}
                                    </div>
                                    <div className="min-w-0 flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[10px] font-semibold text-foreground">{tx.type || "Transaction"}</span>
                                            {tx.amount && tx.token && (
                                                <span className="text-[9px] font-mono text-muted-foreground">{tx.amount} {tx.token}</span>
                                            )}
                                            {!tx.success && <XCircle size={10} className="text-destructive shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[9px] font-mono text-muted-foreground">{tx.signature.slice(0, 8)}...</span>
                                            <span className="text-[8px] text-muted-foreground/60">{tx.blockTime ? formatTimeAgo(tx.blockTime) : ""}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
