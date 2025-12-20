"use client";

import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { AssetInventoryTable } from "@/components/AssetInventoryTable";
import { Search, Filter, Download, Plus, LayoutGrid, List } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { Suspense } from "react";

export default function AssetsPage() {
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

            const prices = await client.getTokenPrices(mints);

            const allAssets = [
                {
                    mint: solMint,
                    symbol: "SOL",
                    name: "Solana Native",
                    balance: solBal,
                    price: prices[solMint] || 0,
                    value: solBal * (prices[solMint] || 0),
                    change24h: 2.45, // Mocked for design
                    allocation: 0
                },
                ...tokens.map(t => ({
                    ...t,
                    price: prices[t.mint] || 0,
                    value: t.amount * (prices[t.mint] || 0),
                    change24h: (Math.random() * 10) - 5,
                    allocation: 0
                }))
            ].filter(a => a.value > 1); // Filter dust

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
        a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-screen bg-[#0B0C10] text-white">
            {/* Assets Header (Consolidated) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0C10]/50 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_#36e27b]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9eb7a8]">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <LayoutGrid className="text-[#36e27b]" size={20} />
                        <h1 className="text-lg font-bold tracking-tight">Vault Inventory</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9eb7a8] group-focus-within:text-[#36e27b] transition-colors" size={12} />
                        <input
                            className="h-8 w-64 bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 text-[10px] font-mono focus:outline-none focus:border-[#36e27b]/50 transition-colors"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="h-8 px-3 bg-white/5 border border-white/10 rounded-lg text-[#9eb7a8] hover:text-white transition-colors">
                            <Filter size={14} />
                        </button>
                        <button className="h-8 px-3 bg-white/5 border border-white/10 rounded-lg text-[#9eb7a8] hover:text-white transition-colors">
                            <Download size={14} />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-white/10" />

                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1F2833]/40 border border-white/5 hover:bg-white/5 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_rgba(54,226,123,0.5)]" />
                        <span className="text-xs font-medium text-white">Devnet</span>
                    </button>

                    <Suspense fallback={<div className="h-8 w-24 bg-white/5 animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-white/10" />

                    <WalletButton />
                </div>
            </header>

            {/* Sub-header (Controls) */}
            <div className="px-6 py-3 flex items-center justify-between bg-[#1F2833]/10 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <input
                        className="h-7 w-56 bg-black/40 border border-white/5 rounded px-2 text-[9px] font-mono text-[#36e27b] placeholder:text-white/20"
                        placeholder="Load Vault PDA..."
                        value={vaultAddress}
                        onChange={(e) => setVaultAddress(e.target.value)}
                    />
                    <button
                        onClick={fetchAssets}
                        className="h-7 px-3 bg-[#36e27b]/10 border border-[#36e27b]/30 text-[#36e27b] rounded text-[9px] font-bold hover:bg-[#36e27b]/20 transition-all"
                    >
                        {loading ? "FETCHING..." : "SYNC INVENTORY"}
                    </button>
                    <button
                        className="h-7 px-3 bg-white/5 border border-white/10 text-[#9eb7a8] rounded text-[9px] font-bold hover:text-white transition-all flex items-center gap-2"
                        onClick={() => {
                            alert("Deep Discovery Stack (Jina/Firecrawl) Triggered: Searching for high-yield protocols for vault assets...");
                        }}
                    >
                        <Search size={10} /> YIELD HUNTER
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-white/5 rounded p-0.5 border border-white/5">
                        <button className="p-1 rounded bg-[#36e27b]/20 text-[#36e27b]"><List size={12} /></button>
                        <button className="p-1 rounded text-[#9eb7a8] hover:text-white"><LayoutGrid size={12} /></button>
                    </div>
                    <button className="h-7 px-4 bg-[#36e27b] text-[#0B0C10] rounded text-[9px] font-bold hover:opacity-90 flex items-center gap-2">
                        <Plus size={12} /> DEPOSIT
                    </button>
                </div>
            </div>

            <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1600px] mx-auto rounded-2xl bg-[#1F2833]/30 border border-white/5 p-4 backdrop-blur-xl">
                    <AssetInventoryTable assets={filteredAssets} />

                    {assets.length === 0 && !loading && (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl mt-4 grayscale opacity-40">
                            <Search size={32} className="mb-4 text-[#9eb7a8]" />
                            <p className="text-[10px] uppercase tracking-widest text-[#9eb7a8]">No assets discovered</p>
                            <p className="text-[12px] text-white/40 mt-1">Enter a Vault PDA above to begin deep discovery</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
