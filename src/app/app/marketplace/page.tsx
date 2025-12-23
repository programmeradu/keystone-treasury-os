"use client";

import React, { useState, useEffect } from "react";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { Bell, Search, Filter, Plus } from "lucide-react";
import { Logo } from "@/components/icons";
import { useNetwork } from "@/lib/contexts/NetworkContext";
import { Suspense } from "react";
import { MiniAppCard } from "@/components/studio/MiniAppCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Mock data until DB fetch is connected in a Server Component or API
const MOCK_APPS = [
    {
        id: "app_1",
        name: "Solana Token Sniper",
        description: "Automatically detect and buy new token launches on Raydium with customizable filters.",
        priceUsdc: 50,
        rating: 4.8,
        installs: 1240,
        creatorWallet: "7KeY...StUdIo",
        category: "DeFi"
    },
    {
        id: "app_2",
        name: "NFT Portfolio Visualizer",
        description: "A stunning 3D gallery view for your Solana NFT collection with floor price tracking.",
        priceUsdc: 0,
        rating: 4.5,
        installs: 8503,
        creatorWallet: "8BoX...CrEaTr",
        category: "NFT"
    },
    {
        id: "app_3",
        name: "Yield Farming Auto-Compounder",
        description: "Optimize your Kamino and Meteora positions with auto-compounding strategies.",
        priceUsdc: 100,
        rating: 4.9,
        installs: 532,
        creatorWallet: "9FaR...Yield",
        category: "DeFi"
    },
    {
        id: "app_4",
        name: "DAO Voter Bot",
        description: "Never miss a governance proposal. Auto-vote based on your preferences.",
        priceUsdc: 10,
        rating: 4.2,
        installs: 300,
        creatorWallet: "3Gov...Voter",
        category: "Governance"
    }
];

export default function MarketplacePage() {
    const [search, setSearch] = useState("");
    const [filteredApps, setFilteredApps] = useState(MOCK_APPS);

    const { network, setNetwork } = useNetwork();

    useEffect(() => {
        const lower = search.toLowerCase();
        setFilteredApps(MOCK_APPS.filter(app =>
            app.name.toLowerCase().includes(lower) ||
            app.description.toLowerCase().includes(lower)
        ));
    }, [search]);

    return (
        <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden relative">
            {/* Standard Dashboard Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10 shadow-sm shrink-0">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">Keystone OS // App Layer</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">Marketplace</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors relative">
                        <Bell size={18} />
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                    </button>
                    <button
                        onClick={() => setNetwork(network === 'mainnet-beta' ? 'devnet' : 'mainnet-beta')}
                        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${network === 'mainnet-beta' ? 'bg-primary/10 border-primary/20 hover:bg-primary/20' : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'}`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${network === 'mainnet-beta' ? 'bg-primary' : 'bg-orange-500'}`} />
                        <span className="text-xs font-medium text-foreground uppercase">{network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}</span>
                    </button>

                    <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-border mx-1" />

                    <WalletButton />
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
                <div className="max-w-[1600px] mx-auto">

                    {/* Hero Section */}
                    <div className="relative rounded-3xl bg-card border border-border p-8 md:p-12 mb-10 overflow-hidden isolate shadow-2xl">
                        {/* Abstract Background */}
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

                        {/* Keystone Logo Watermark */}
                        <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-[0.05] pointer-events-none rotate-[-10deg]">
                            <Logo size={320} fillColor="currentColor" className="text-primary" />
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div className="max-w-2xl">
                                <h2 className="text-5xl font-black tracking-tighter mb-4">
                                    Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Power Tools</span>
                                </h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Browse, install, and deploy audited mini-apps to supercharge your treasury operations.
                                    Built by the community, secured by Keystone.
                                </p>
                            </div>
                            <Button size="lg" className="h-12 px-8 text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(54,226,123,0.3)] hover:shadow-[0_0_30px_rgba(54,226,123,0.5)] transition-all bg-primary text-black hover:bg-primary/90">
                                <Plus size={18} className="mr-2" />
                                Publish App
                            </Button>
                        </div>

                        {/* Search Bar Floating Overlay */}
                        <div className="mt-12 flex gap-4 max-w-xl bg-background/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-lg">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                                <Input
                                    placeholder="Search strategies, bots, automation..."
                                    className="h-12 pl-12 bg-transparent border-none text-lg focus-visible:ring-0 placeholder:text-muted-foreground/50"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className="h-12 w-12 p-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30">
                                <Filter size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* App Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredApps.map(app => (
                            <MiniAppCard key={app.id} app={app} />
                        ))}
                    </div>

                    {filteredApps.length === 0 && (
                        <div className="text-center py-32">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No apps found</h3>
                            <p className="text-muted-foreground">Try adjusting your search terms.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
