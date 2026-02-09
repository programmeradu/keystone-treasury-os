"use client";

import React, { useState, useMemo } from "react";
import { AssetInventoryTable } from "@/components/AssetInventoryTable";
import { Search, Plus, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { useVault } from "@/lib/contexts/VaultContext";
import { useImportedTokens } from "@/lib/hooks/useImportedTokens";
import { ImportTokenModal } from "@/components/treasury/ImportTokenModal";

export function VaultAssetsView() {
    const { vaultTokens, vaultValue, vaultChange24h, loading, refresh, activeVault, importedMints } = useVault();
    const { addToken } = useImportedTokens();
    const [searchQuery, setSearchQuery] = useState("");
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Transform vaultTokens into the shape AssetInventoryTable expects
    const assets = useMemo(() => {
        if (!vaultTokens || vaultTokens.length === 0) return [];
        const totalValue = vaultTokens.reduce((acc: number, t: any) => acc + (t.value || 0), 0);
        return vaultTokens.map((t: any) => ({
            mint: t.mint ?? "",
            symbol: t.symbol ?? "???",
            name: t.name ?? t.symbol ?? "Unknown",
            balance: t.balance ?? t.amount ?? 0,
            value: t.value ?? 0,
            price: t.price ?? 0,
            change24h: t.change24h ?? 0,
            allocation: totalValue > 0 ? ((t.value ?? 0) / totalValue) * 100 : 0,
            logo: t.logo ?? t.logoURI ?? undefined,
        }));
    }, [vaultTokens]);

    const filteredAssets = useMemo(() => {
        if (!searchQuery) return assets;
        const q = searchQuery.toLowerCase();
        return assets.filter((a: any) =>
            (a?.symbol || "").toLowerCase().includes(q) ||
            (a?.name || "").toLowerCase().includes(q)
        );
    }, [assets, searchQuery]);

    const topAssets = useMemo(() => assets.slice(0, 3), [assets]);

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Control Bar */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 px-4 pt-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input
                            className="w-full h-9 bg-muted/50 border border-border rounded-lg pl-9 pr-4 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between xl:justify-end gap-3 w-full xl:w-auto">
                    <button
                        onClick={() => refresh()}
                        disabled={loading || !activeVault}
                        className="h-9 px-4 bg-muted border border-border text-foreground rounded-lg text-[10px] font-medium hover:bg-muted/80 transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button
                        onClick={() => setImportModalOpen(true)}
                        className="h-9 px-4 bg-muted border border-border text-foreground rounded-lg text-[10px] font-medium hover:bg-muted/80 transition-colors flex items-center gap-2 shrink-0"
                    >
                        <Plus size={12} /> Import Token
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4">
                <div className="px-4 py-3 rounded-xl bg-card border border-border flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">Total Value</span>
                    <span className="text-sm font-mono font-bold text-foreground">
                        {vaultValue ? `$${vaultValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "$0"}
                    </span>
                </div>
                <div className="px-4 py-3 rounded-xl bg-card border border-border flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">24h Change</span>
                    <span className={`text-sm font-mono font-bold ${(vaultChange24h ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                        {vaultChange24h !== null ? `${vaultChange24h >= 0 ? '+' : ''}${vaultChange24h.toFixed(2)}%` : "--"}
                    </span>
                </div>
                <div className="px-4 py-3 rounded-xl bg-card border border-border flex items-center gap-3 col-span-2">
                    <span className="text-[10px] font-medium text-muted-foreground">Top Assets:</span>
                    <div className="flex gap-2">
                        {topAssets.map((a: any, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono text-foreground">
                                {a.symbol} ({a.allocation.toFixed(1)}%)
                            </span>
                        ))}
                        {topAssets.length === 0 && <span className="text-[9px] text-muted-foreground">No data</span>}
                    </div>
                </div>
            </div>

            {/* Asset Table */}
            <div className="flex-1 flex flex-col relative border-t border-border mt-2">
                <div className="relative z-10 flex-1 overflow-auto scrollbar-thin">
                    {filteredAssets.length > 0 ? (
                        <AssetInventoryTable assets={filteredAssets} />
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                                <Search size={20} className="text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">
                                {!activeVault ? "No address connected" : loading ? "Syncing assets..." : searchQuery ? "No matching assets" : "No assets found"}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60">
                                {!activeVault ? "Connect an address from the sidebar to view assets" : loading ? "Please wait..." : ""}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Import Token Modal */}
            <ImportTokenModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={(token) => {
                    addToken(token);
                    refresh();
                }}
                existingMints={[...vaultTokens.map((t: any) => t.mint), ...importedMints]}
            />
        </div>
    );
}
