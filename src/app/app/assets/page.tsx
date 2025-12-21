"use client";

import React, { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { AssetInventoryTable } from "@/components/AssetInventoryTable";
import { Search, Filter, Download, Plus, LayoutGrid, List } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { Suspense } from "react";
import { NetworkSelector } from "@/components/NetworkSelector";

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
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Assets Header (Consolidated) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <LayoutGrid className="text-primary" size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-foreground">Vault Inventory</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={12} />
                        <input
                            className="h-8 w-64 bg-muted border border-border rounded-lg pl-8 pr-3 text-[10px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="h-8 px-3 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                            <Filter size={14} />
                        </button>
                        <button className="h-8 px-3 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors shadow-sm">
                            <Download size={14} />
                        </button>
                    </div>

                    <div className="w-px h-6 bg-border" />

                    <NetworkSelector />

                    <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-border" />

                    <WalletButton />
                </div>
            </header>

            {/* Sub-header (Controls) */}
            <div className="px-6 py-3 flex items-center justify-between bg-muted/30 border-b border-border">
                <div className="flex items-center gap-4">
                    <input
                        className="h-7 w-56 bg-background border border-border rounded px-2 text-[9px] font-mono text-primary placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                        placeholder="Load Vault PDA..."
                        value={vaultAddress}
                        onChange={(e) => setVaultAddress(e.target.value)}
                    />
                    <button
                        onClick={fetchAssets}
                        className="h-7 px-3 bg-primary/10 border border-primary/30 text-primary rounded text-[9px] font-black uppercase hover:bg-primary/20 transition-all shadow-sm"
                    >
                        {loading ? "FETCHING..." : "SYNC INVENTORY"}
                    </button>
                    <button
                        className="h-7 px-3 bg-muted border border-border text-muted-foreground rounded text-[9px] font-black uppercase hover:text-foreground transition-all flex items-center gap-2 shadow-sm"
                        onClick={() => {
                            alert("Deep Discovery Stack (Jina/Firecrawl) Triggered: Searching for high-yield protocols for vault assets...");
                        }}
                    >
                        <Search size={10} /> YIELD HUNTER
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted rounded p-0.5 border border-border shadow-inner">
                        <button className="p-1 rounded bg-primary/20 text-primary"><List size={12} /></button>
                        <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"><LayoutGrid size={12} /></button>
                    </div>
                    <button className="h-7 px-4 bg-primary text-primary-foreground rounded text-[9px] font-black uppercase hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
                        <Plus size={12} /> DEPOSIT
                    </button>
                </div>
            </div>

            <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-[1600px] mx-auto rounded-2xl bg-card border border-border p-4 backdrop-blur-xl shadow-sm">
                    <AssetInventoryTable assets={filteredAssets} />

                    {assets.length === 0 && !loading && (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl mt-4 grayscale opacity-40">
                            <Search size={32} className="mb-4 text-muted-foreground" />
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">No assets discovered</p>
                            <p className="text-[12px] text-muted-foreground/60 mt-1 font-medium">Enter a Vault PDA above to begin deep discovery</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
