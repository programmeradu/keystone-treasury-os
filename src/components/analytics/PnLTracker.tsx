"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useVault } from "@/lib/contexts/VaultContext";
import { TrendingUp, TrendingDown, Loader2, DollarSign } from "lucide-react";
import { getTokenColor } from "@/lib/token-colors";

interface FlowTx {
    signature: string;
    timestamp: number;
    category: string;
    token: string;
    tokenAmount: number;
    amountUsd: number;
}

interface CostBasisLot {
    amount: number;
    pricePerToken: number;
    timestamp: number;
}

interface TokenPnL {
    symbol: string;
    currentAmount: number;
    currentValue: number;
    currentPrice: number;
    avgCostBasis: number;
    totalCost: number;
    unrealizedPnl: number;
    unrealizedPct: number;
    color: string;
    hasReliableBasis: boolean;
    coverage: number; // 0-100%
}

export const PnLTracker = () => {
    const { activeVault, vaultTokens } = useVault();
    const [flowData, setFlowData] = useState<FlowTx[] | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!activeVault) { setFlowData(null); return; }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/analytics/flows?address=${activeVault}&months=12&granularity=daily`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setFlowData(data.transactions || []);
            } catch { /* ignore */ }
            finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [activeVault]);

    // Compute P&L per token using FIFO cost basis
    const pnlData = useMemo((): TokenPnL[] => {
        if (!flowData || vaultTokens.length === 0) return [];

        // Build cost basis lots from inflow transactions
        const costBasisMap: Record<string, CostBasisLot[]> = {};

        // Sort transactions chronologically (oldest first)
        const sorted = [...flowData].sort((a, b) => a.timestamp - b.timestamp);

        for (const tx of sorted) {
            if (tx.category === "inflow" || tx.category === "staking") {
                if (tx.tokenAmount > 0 && tx.amountUsd > 0) {
                    const sym = tx.token.toUpperCase();
                    if (!costBasisMap[sym]) costBasisMap[sym] = [];
                    costBasisMap[sym].push({
                        amount: tx.tokenAmount,
                        pricePerToken: tx.amountUsd / tx.tokenAmount,
                        timestamp: tx.timestamp,
                    });
                }
            }
        }

        // Compute P&L for each current holding
        return vaultTokens
            .filter(t => (t.value || 0) > 0)
            .map(t => {
                const sym = (t.symbol || "").toUpperCase();
                const currentAmount = t.amount || 0;
                const currentPrice = t.price || 0;
                const currentValue = t.value || 0;

                const lots = costBasisMap[sym] || [];
                let totalCost = 0;
                let accountedAmount = 0;

                // FIFO: walk through lots oldest-first
                for (const lot of lots) {
                    if (accountedAmount >= currentAmount) break;
                    const remaining = currentAmount - accountedAmount;
                    const useAmount = Math.min(lot.amount, remaining);
                    totalCost += useAmount * lot.pricePerToken;
                    accountedAmount += useAmount;
                }

                // Cost basis coverage: what % of current holdings have recorded acquisition cost
                const coverage = currentAmount > 0 ? Math.min(1, accountedAmount / currentAmount) : 0;
                const avgCostBasis = accountedAmount > 0 ? totalCost / accountedAmount : 0;

                // For tokens with incomplete cost basis (<10% coverage), mark as unknown
                const hasReliableBasis = coverage > 0.1 && totalCost > 0;
                const unrealizedPnl = hasReliableBasis ? currentValue - totalCost : 0;
                const unrealizedPct = hasReliableBasis && totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0;

                return {
                    symbol: t.symbol || "SPL",
                    currentAmount,
                    currentValue,
                    currentPrice,
                    avgCostBasis,
                    totalCost: Math.round(totalCost * 100) / 100,
                    unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
                    unrealizedPct: Math.round(unrealizedPct * 100) / 100,
                    color: getTokenColor(t.symbol || "SPL"),
                    hasReliableBasis,
                    coverage: Math.round(coverage * 100),
                };
            })
            .sort((a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl));
    }, [flowData, vaultTokens]);

    // Portfolio totals — only count tokens with reliable cost basis
    const totals = useMemo(() => {
        const reliable = pnlData.filter(t => t.hasReliableBasis);
        const totalValue = reliable.reduce((s, t) => s + t.currentValue, 0);
        const totalCost = reliable.reduce((s, t) => s + t.totalCost, 0);
        const totalPnl = totalValue - totalCost;
        const totalPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
        const trackedCount = reliable.length;
        const untrackedCount = pnlData.length - reliable.length;
        return { totalValue, totalCost, totalPnl, totalPct, trackedCount, untrackedCount };
    }, [pnlData]);

    // Compact number formatter
    const fmtUsd = (v: number) => {
        const abs = Math.abs(v);
        const sign = v >= 0 ? "+" : "-";
        if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
        if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
        return `${sign}$${abs.toFixed(0)}`;
    };

    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">P&L / Cost Basis</span>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <DollarSign size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault to track P&L</p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-primary" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">P&L / Cost Basis</span>
                    {loading && <Loader2 size={10} className="animate-spin text-primary" />}
                </div>
            </div>

            {/* Portfolio Total */}
            {pnlData.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-border">
                    {totals.trackedCount > 0 ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">Unrealized P&L</span>
                                <div className={`text-lg font-bold tracking-tight ${totals.totalPnl >= 0 ? "text-primary" : "text-destructive"}`}>
                                    {fmtUsd(totals.totalPnl)}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">Return</span>
                                <div className={`text-base font-bold ${totals.totalPct >= 0 ? "text-primary" : "text-destructive"} flex items-center gap-1 justify-end`}>
                                    {totals.totalPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    {totals.totalPct >= 0 ? "+" : ""}{totals.totalPct.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase block">Holdings Tracked</span>
                            <span className="text-lg font-bold text-foreground">{pnlData.length} assets</span>
                        </div>
                    )}
                    {totals.untrackedCount > 0 && (
                        <p className="text-[8px] text-muted-foreground/60 mt-2 font-mono">
                            {totals.untrackedCount} asset{totals.untrackedCount > 1 ? "s" : ""} without sufficient on-chain acquisition history for cost basis
                        </p>
                    )}
                </div>
            )}

            {/* Per-Token P&L */}
            <div className="space-y-2 overflow-y-auto flex-1 max-h-[200px] scrollbar-thin">
                {loading && pnlData.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                ) : pnlData.length === 0 ? (
                    <p className="text-center text-[10px] text-muted-foreground/60 py-4">No transaction history for cost basis</p>
                ) : (
                    pnlData.map(token => (
                        <div key={token.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border hover:border-primary/20 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: token.color }} />
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-foreground block">{token.symbol}</span>
                                    <span className="text-[8px] text-muted-foreground font-mono">
                                        {token.currentAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
                                    </span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                {token.hasReliableBasis ? (
                                    <>
                                        <span className={`text-[10px] font-bold block ${token.unrealizedPnl >= 0 ? "text-primary" : "text-destructive"}`}>
                                            {fmtUsd(token.unrealizedPnl)}
                                        </span>
                                        <span className={`text-[8px] font-mono ${token.unrealizedPct >= 0 ? "text-primary/70" : "text-destructive/70"}`}>
                                            {token.unrealizedPct >= 0 ? "+" : ""}{token.unrealizedPct.toFixed(1)}%
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[10px] font-bold text-foreground block">
                                            ${token.currentValue >= 1000 ? `${(token.currentValue / 1000).toFixed(1)}K` : token.currentValue.toFixed(0)}
                                        </span>
                                        <span className="text-[7px] text-muted-foreground/50 font-mono uppercase">no basis</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
