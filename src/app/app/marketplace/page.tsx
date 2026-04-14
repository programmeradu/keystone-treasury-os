"use client";

import React, { useState, useEffect, useCallback } from "react";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { Search, Filter, Plus, Box, ArrowRight, Rocket } from "lucide-react";
import { Logo } from "@/components/icons";
import { useNetwork } from "@/lib/contexts/NetworkContext";
import { Suspense } from "react";
import { MiniAppCard } from "@/components/studio/MiniAppCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PremiumModal, PremiumModalHeader, PremiumModalTitle, PremiumModalDescription } from "@/components/ui/PremiumModal";
import { ListingModal } from "@/components/studio/ListingModal";
import { NotificationBell } from "@/components/NotificationBell";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

const CATEGORIES = ["All", "DeFi", "NFT", "Governance", "Analytics", "Utility", "Trading", "Security", "Social"];

export default function MarketplacePage() {
    const [search, setSearch] = useState("");
    const [allApps, setAllApps] = useState<any[]>([]);
    const [filteredApps, setFilteredApps] = useState<any[]>([]);
    const [showPublishPicker, setShowPublishPicker] = useState(false);
    const [libraryApps, setLibraryApps] = useState<any[]>([]);
    const [listingApp, setListingApp] = useState<any>(null);
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [showFilters, setShowFilters] = useState(false);
    const [loadingApps, setLoadingApps] = useState(true);

    const { network, setNetwork } = useNetwork();
    const { publicKey } = useWallet();

    const loadMarketplaceListings = useCallback(async () => {
        setLoadingApps(true);
        try {
            const res = await fetch("/api/studio/marketplace");
            const dbApps = res.ok ? await res.json() : [];
            setAllApps(Array.isArray(dbApps) ? dbApps : []);
        } catch {
            setAllApps([]);
        } finally {
            setLoadingApps(false);
        }
    }, []);

    // Load apps on mount
    useEffect(() => {
        loadMarketplaceListings();
    }, [loadMarketplaceListings]);

    // Load library apps when publish picker opens
    useEffect(() => {
        if (showPublishPicker) {
            (async () => {
                try {
                    const { getInstalledApps } = await import("@/actions/studio-actions");
                    const walletAddress = publicKey?.toBase58() || "";
                    const apps = await getInstalledApps(walletAddress);
                    setLibraryApps(apps);
                } catch {
                    setLibraryApps([]);
                }
            })();
        }
    }, [showPublishPicker, publicKey]);

    useEffect(() => {
        const lower = search.toLowerCase();
        setFilteredApps(allApps.filter(app => {
            const matchesSearch = app.name.toLowerCase().includes(lower) ||
                app.description.toLowerCase().includes(lower);
            const matchesCategory = categoryFilter === "All" ||
                app.category.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        }));
    }, [search, allApps, categoryFilter]);

    return (
        <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden relative">
            {/* Standard Dashboard Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10 shadow-sm shrink-0">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">dreyv OS // App Layer</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">Marketplace</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NotificationBell />
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

                        {/* dreyv logo watermark */}
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
                                    Built by the community, secured by dreyv.
                                </p>
                            </div>
                            <Button
                                size="lg"
                                onClick={() => setShowPublishPicker(true)}
                                className="h-12 px-8 text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(54,226,123,0.3)] hover:shadow-[0_0_30px_rgba(54,226,123,0.5)] transition-all bg-primary text-black hover:bg-primary/90"
                            >
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
                            <Button
                                variant="outline"
                                onClick={() => setShowFilters(f => !f)}
                                className={`h-12 w-12 p-0 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 ${showFilters ? 'border-primary/40 bg-primary/10' : ''}`}
                            >
                                <Filter size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    {showFilters && (
                        <div className="flex flex-wrap gap-2 mb-8 animate-in fade-in slide-in-from-top-2 duration-200">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${categoryFilter === cat
                                            ? 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_12px_rgba(54,226,123,0.15)]'
                                            : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* App Grid */}
                    {loadingApps ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-card border border-border rounded-2xl p-6 animate-pulse">
                                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                                    <div className="h-3 bg-muted rounded w-full mb-2" />
                                    <div className="h-3 bg-muted rounded w-2/3 mb-6" />
                                    <div className="h-8 bg-muted rounded w-1/3" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredApps.map(app => (
                                <MiniAppCard key={app.id} app={app} />
                            ))}
                        </div>
                    )}

                    {!loadingApps && filteredApps.length === 0 && (
                        <div className="text-center py-32">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No apps found</h3>
                            <p className="text-muted-foreground">Publish your first app or adjust your search.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Publish Picker Dialog */}
            <PremiumModal isOpen={showPublishPicker} onClose={() => setShowPublishPicker(false)} className="sm:max-w-[500px]">
                <PremiumModalHeader>
                    <PremiumModalTitle className="flex items-center gap-2">
                        <Rocket size={18} className="text-primary" />
                        Publish to Marketplace
                    </PremiumModalTitle>
                    <PremiumModalDescription>
                        Select an app from your Library to list on the Marketplace.
                    </PremiumModalDescription>
                </PremiumModalHeader>

                {libraryApps.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                            <Box size={28} />
                        </div>
                        <div>
                            <p className="font-bold mb-1">No apps in your Library</p>
                            <p className="text-sm text-muted-foreground">Build an app in the Studio and SHIP it first.</p>
                        </div>
                        <Link href="/app/studio">
                            <Button className="gap-2">
                                Open Studio <ArrowRight size={14} />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
                        {libraryApps.map((app: any) => {
                            const alreadyListed = app.isPublished;
                            return (
                                <button
                                    key={app.id}
                                    onClick={() => {
                                        setShowPublishPicker(false);
                                        setListingApp(app);
                                    }}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary shrink-0">
                                        <Box size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{app.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{app.description || "No description"}</p>
                                    </div>
                                    <div className="shrink-0">
                                        {alreadyListed ? (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">Update</span>
                                        ) : (
                                            <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </PremiumModal>

            {/* Listing Modal */}
            {listingApp && (
                <ListingModal
                    open={!!listingApp}
                    onOpenChange={(open) => { if (!open) setListingApp(null); }}
                    app={listingApp}
                    onSuccess={() => {
                        setListingApp(null);
                        loadMarketplaceListings();
                    }}
                />
            )}
        </div>
    );
}
