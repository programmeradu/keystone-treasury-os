"use client";

import React, { useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { AssetInventoryTable } from "@/components/AssetInventoryTable";
import { Search, Filter, ArrowUpRight, Plus, LayoutGrid, List, TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { NetworkSelector } from "@/components/NetworkSelector";

export function VaultAssetsView() {
    const { connection } = useConnection();
    const [vaultAddress, setVaultAddress] = useState("");
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    async function fetchAssets() {
        if (!vaultAddress) return;
        setLoading(true);
        try {
            const client = new SquadsClient(connection, {});
            const tokens = await client.getVaultTokens(vaultAddress);
            const solBal = await client.getVaultBalance(vaultAddress);

            const mints = tokens.map(t => t.mint);
            const solMint = "So11111111111111111111111111111111111111112";
            if (!mints.includes(solMint)) mints.push(solMint);

            const metadata = await client.getTokenMetadata(mints);

            const allAssets = [
                {
                    mint: solMint,
                    symbol: "SOL",
                    name: "Solana Native",
                    balance: solBal,
                    price: metadata[solMint]?.price || 0,
                    value: solBal * (metadata[solMint]?.price || 0),
                    change24h: metadata[solMint]?.change24h || 2.45,
                    allocation: 0,
                    logo: metadata[solMint]?.logo
                },
                ...tokens.map(t => ({
                    ...t,
                    ...metadata[t.mint],
                    balance: t.amount,
                    price: metadata[t.mint]?.price || 0,
                    value: t.amount * (metadata[t.mint]?.price || 0),
                    change24h: metadata[t.mint]?.change24h || 0,
                    allocation: 0
                }))
            ].filter(a => a.value > 1);

            const totalValue = allAssets.reduce((acc, a) => acc + a.value, 0);
            const normalizedAssets = allAssets.map(a => ({
                ...a,
                allocation: totalValue > 0 ? (a.value / totalValue) * 100 : 0
            })).sort((a, b) => b.value - a.value);

            setAssets(normalizedAssets);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const filteredAssets = assets.filter(a =>
        (a?.symbol || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Control Bar - Slim & De-Containerized */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 px-4 pt-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input
                            className="w-full h-9 bg-zinc-900/50 border border-zinc-800 rounded-lg pl-9 pr-4 text-[10px] font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-colors"
                            placeholder="SEARCH_ASSETS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between xl:justify-end gap-3 w-full xl:w-auto">
                    <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1 border border-zinc-800">
                        <button className="p-1.5 rounded-md bg-zinc-800 text-white"><List size={12} /></button>
                        <button className="p-1.5 rounded-md text-zinc-500 hover:text-white transition-colors"><LayoutGrid size={12} /></button>
                    </div>
                    <button className="h-9 px-4 bg-white/5 border border-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2 shrink-0">
                        <Plus size={12} /> Deposit
                    </button>
                </div>
            </div>

            {/* Yield / Performance Slats - Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4">
                <div className="px-4 py-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Total Value</span>
                    <span className="text-sm font-mono font-black text-white">
                        ${assets.reduce((acc, a) => acc + (a.value || 0), 0).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                            notation: "compact"
                        })}
                    </span>
                </div>
                <div className="px-4 py-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">24h Perf</span>
                    <span className={`text-sm font-mono font-black ${assets.reduce((acc, a) => acc + (a.change24h || 0), 0) / (assets.length || 1) >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}>
                        {(assets.reduce((acc, a) => acc + (a.change24h || 0), 0) / (assets.length || 1)).toFixed(2)}%
                    </span>
                </div>
                <div className="px-4 py-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 flex items-center gap-3 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Top Assets:</span>
                    <div className="flex gap-2">
                        {assets.slice(0, 3).map((a, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-mono text-zinc-300 uppercase">
                                {a.symbol} ({(a.allocation || 0).toFixed(1)}%)
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Inventory List - Max Height */}
            <div className="flex-1 flex flex-col relative border-t border-zinc-800/50 mt-2">
                <div className="absolute inset-0 bg-zinc-900/10 pointer-events-none" />
                <div className="relative z-10 flex-1 overflow-auto scrollbar-thin">
                    <AssetInventoryTable assets={filteredAssets} />

                    {assets.length === 0 && !loading && (
                        <div className="h-64 flex flex-col items-center justify-center opacity-50">
                            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-4">
                                <Search size={20} className="text-zinc-600" />
                            </div>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4">No assets synced</p>
                            <input
                                className="h-9 w-64 bg-black border border-zinc-800 rounded-lg px-4 text-[10px] font-mono text-center text-white focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Paste Vault PDA to Sync..."
                                value={vaultAddress}
                                onChange={(e) => setVaultAddress(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
