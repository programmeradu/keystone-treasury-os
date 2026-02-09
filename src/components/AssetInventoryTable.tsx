"use client";

import React, { useState } from "react";
import { ExternalLink, Repeat, Copy, Check } from "lucide-react";

interface Asset {
    mint: string;
    symbol: string;
    name: string;
    balance: number;
    value: number;
    price: number;
    change24h: number;
    allocation: number;
    logo?: string;
}

interface AssetInventoryTableProps {
    assets: Asset[];
}

export const AssetInventoryTable = ({ assets }: AssetInventoryTableProps) => {
    const [copiedMint, setCopiedMint] = useState<string | null>(null);

    const handleCopy = (mint: string) => {
        navigator.clipboard.writeText(mint);
        setCopiedMint(mint);
        setTimeout(() => setCopiedMint(null), 1500);
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-y-1.5">
                <thead>
                    <tr className="text-[10px] text-muted-foreground uppercase tracking-wider text-left">
                        <th className="px-4 py-3 font-semibold">Asset</th>
                        <th className="px-4 py-3 font-semibold text-right">Balance</th>
                        <th className="px-4 py-3 font-semibold text-right">Value (USD)</th>
                        <th className="px-4 py-3 font-semibold text-right">Price</th>
                        <th className="px-4 py-3 font-semibold text-right">24h Change</th>
                        <th className="px-4 py-3 font-semibold text-right">Allocation</th>
                        <th className="px-4 py-3 font-semibold text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-[11px] font-medium">
                    {assets.map((asset) => (
                        <tr
                            key={asset.mint}
                            className="bg-muted/10 hover:bg-primary/5 border border-border rounded-lg transition-all group"
                        >
                            <td className="px-4 py-3 rounded-l-lg border-l border-t border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold border border-border group-hover:border-primary/50 transition-colors overflow-hidden">
                                        {asset?.logo ? (
                                            <img src={asset.logo} alt={asset.symbol} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-foreground">{(asset?.symbol || "??").substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="block text-foreground font-bold text-[10px] tracking-tight">{asset?.symbol || "Unknown"}</span>
                                        <span className="block text-[8px] text-muted-foreground truncate max-w-[80px]">{asset?.name || "No Name"}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right border-t border-b border-border">
                                <span className="text-foreground font-bold">{(asset.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                            </td>
                            <td className="px-4 py-3 text-right border-t border-b border-border">
                                <span className="text-foreground font-bold">${(asset.value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </td>
                            <td className="px-4 py-3 text-right border-t border-b border-border font-mono text-[10px] text-muted-foreground">
                                ${(asset.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right border-t border-b border-border font-bold">
                                <span className={(asset.change24h ?? 0) >= 0 ? "text-primary" : "text-destructive"}>
                                    {(asset.change24h ?? 0) >= 0 ? "+" : ""}{(asset.change24h ?? 0).toFixed(2)}%
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right border-t border-b border-border">
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-primary" style={{ width: `${asset.allocation}%` }} />
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-medium">{asset.allocation.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 rounded-r-lg border-r border-t border-b border-border">
                                <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button
                                        title="Swap on Jupiter"
                                        onClick={() => window.open(`https://jup.ag/swap/${asset.mint}`, "_blank")}
                                        className="p-1.5 rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors border border-border shadow-sm"
                                    >
                                        <Repeat size={12} />
                                    </button>
                                    <button
                                        title="Copy mint address"
                                        onClick={() => handleCopy(asset.mint)}
                                        className="p-1.5 rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors border border-border shadow-sm"
                                    >
                                        {copiedMint === asset.mint ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                                    </button>
                                    <button
                                        title="View on Explorer"
                                        onClick={() => window.open(`https://explorer.solana.com/address/${asset.mint}`, "_blank")}
                                        className="p-1.5 rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors border border-border shadow-sm"
                                    >
                                        <ExternalLink size={12} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
