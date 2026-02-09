"use client";

import React from "react";
import { useParams } from "next/navigation"; // Correct hook for App Router
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Download, ShieldCheck, Zap, Code, Shield, CheckCircle2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { getAvatarUrl } from "@/lib/avatars";
import { PurchaseModal } from "@/components/studio/PurchaseModal";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { WalletButton } from "@/components/WalletButton";
import { toast } from "@/lib/toast-notifications";
import { NotificationBell } from "@/components/NotificationBell";

// Fallback mock data for legacy/demo app IDs
const MOCK_APPS: Record<string, any> = {
    "app_1": {
        id: "app_1", name: "Solana Token Sniper",
        description: "The ultimate tool for efficient token acquisition on the Solana network. \n\nFeatures:\n- Real-time Raydium pool monitoring\n- Configurable slippage and gas settings\n- Anti-rug checks via RugCheck API\n- Auto-sell strategies based on PnL\n\nPerfect for high-frequency traders who need speed and precision. Built with Rust for maximum performance and security.",
        priceUsdc: 50, rating: 4.8, installs: 1240, creatorWallet: "7KeY...StUdIo", category: "DeFi", version: "1.2.4", updatedAt: "2 days ago",
    },
    "app_2": {
        id: "app_2", name: "NFT Portfolio Visualizer",
        description: "A stunning 3D gallery view for your Solana NFT collection with floor price tracking.",
        priceUsdc: 0, rating: 4.5, installs: 8503, creatorWallet: "8BoX...CrEaTr", category: "NFT", version: "2.0.1", updatedAt: "1 week ago",
    },
    "app_3": {
        id: "app_3", name: "Yield Farming Auto-Compounder",
        description: "Optimize your Kamino and Meteora positions with auto-compounding strategies.",
        priceUsdc: 100, rating: 4.9, installs: 532, creatorWallet: "9FaR...Yield", category: "DeFi", version: "1.0.0", updatedAt: "3 days ago",
    },
    "app_4": {
        id: "app_4", name: "DAO Voter Bot",
        description: "Never miss a governance proposal. Auto-vote based on your preferences.",
        priceUsdc: 10, rating: 4.2, installs: 300, creatorWallet: "3Gov...Voter", category: "Governance", version: "0.9.0", updatedAt: "5 days ago",
    },
};

function loadAppDetails(appId: string) {
    // Try localStorage marketplace listings first
    try {
        const listings = JSON.parse(localStorage.getItem("keystone_marketplace_listings") || "[]");
        const found = listings.find((a: any) => a.id === appId);
        if (found) {
            return {
                ...found,
                updatedAt: found.updatedAt ? new Date(found.updatedAt).toLocaleDateString() : "Recently",
            };
        }
    } catch {}
    // Fall back to mock
    return MOCK_APPS[appId] || null;
}

export default function AppDetailPage() {
    const params = useParams();
    const appId = params.appId as string;

    const [app, setApp] = React.useState<any>(null);
    const [showPurchaseModal, setShowPurchaseModal] = React.useState(false);
    const [installedVersion, setInstalledVersion] = React.useState<string | null>(null);

    React.useEffect(() => {
        setApp(loadAppDetails(appId));
        // Check if already installed
        try {
            const library = JSON.parse(localStorage.getItem("keystone_library_apps") || "[]");
            const found = library.find((a: any) => a.id === appId);
            if (found) setInstalledVersion(found.version || "1.0.0");
        } catch {}
    }, [appId]);

    if (!app) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
                <Zap size={48} className="text-muted-foreground" />
                <h1 className="text-xl font-bold">App Not Found</h1>
                <p className="text-muted-foreground">This app is not listed on the marketplace.</p>
                <Link href="/app/marketplace">
                    <Button variant="outline">Back to Marketplace</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden relative selection:bg-[#36e27b] selection:text-black">
            {/* Header (Standard) */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10 shadow-sm shrink-0">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Link href="/app/marketplace" className="hover:text-primary transition-colors flex items-center gap-2 group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70 group-hover:text-primary transition-colors">Keystone App Store</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">{app.name}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NotificationBell />
                    <div className="w-px h-6 bg-border mx-1" />
                    <WalletButton />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-thin relative">

                {/* Immersive Header Background with Keystone Brand Watermark */}
                <div className="relative h-80 w-full bg-[#0B0C10] border-b border-border/50 overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                    {/* Keystone Brand Gradient */}
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#36e27b]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

                    {/* Subtle Keystone Logo Watermark */}
                    <svg className="absolute top-10 right-20 w-96 h-96 opacity-[0.03] pointer-events-none" viewBox="0 0 200 200" fill="none">
                        <path d="M 98.00 28.00 C 96.69 24.44 97.68 21.31 98.00 18.00 C 98.00 15.33 98.00 12.67 98.00 10.00 C 100.74 8.89 104.24 7.53 106.00 5.00 C 125.59 14.33 142.63 29.26 162.00 39.00 C 154.48 46.29 139.54 60.68 129.30 51.70 C 119.07 42.72 105.55 39.19 98.00 28.00 M 77.00 57.00 C 69.18 70.17 87.60 76.90 95.25 82.75 C 102.89 88.61 98.71 92.10 89.00 90.00 C 79.29 87.90 54.17 95.94 50.00 82.00 C 48.31 76.35 50.16 66.82 50.00 61.00 C 49.84 55.18 48.27 45.55 51.00 41.00 C 54.66 34.90 65.17 33.43 70.70 28.70 C 76.22 23.96 85.30 19.53 92.00 17.00 C 92.92 23.60 89.87 31.61 97.25 35.75 C 104.62 39.89 96.93 44.24 91.92 46.92 C 86.91 49.61 81.56 53.86 77.00 57.00 M 162.00 85.00 C 156.19 91.47 146.58 94.25 139.77 99.77 C 132.96 105.29 123.77 110.12 116.00 114.00 C 114.99 104.66 118.92 92.65 112.00 86.00 C 116.49 82.60 121.18 79.80 126.00 77.00 C 129.50 74.81 133.13 71.58 137.00 70.00 C 136.64 56.86 154.24 53.51 163.00 47.00 C 166.55 49.11 163.31 61.50 164.00 66.00 C 164.69 70.50 165.03 81.63 162.00 85.00 M 112.00 53.00 C 113.54 52.66 116.18 52.62 117.00 54.00 C 118.04 55.77 107.82 61.29 109.00 64.00 C 112.75 66.60 115.76 70.21 118.00 74.00 C 110.70 78.49 109.31 66.80 103.00 67.00 C 104.03 71.78 102.51 75.57 97.00 74.00 C 97.00 67.00 97.00 60.00 97.00 53.00 C 103.21 51.02 103.69 56.22 103.00 61.00 C 106.45 58.95 108.58 55.00 112.00 53.00" fill="#36e27b" />
                    </svg>
                </div>

                <div className="max-w-6xl mx-auto px-8 -mt-40 relative z-10 pb-20">
                    {/* Header Card */}
                    <div className="flex flex-col lg:flex-row gap-10 mb-16 items-end">
                        <div className="w-48 h-48 rounded-3xl bg-[#0B0C10] border border-white/10 flex items-center justify-center shrink-0 shadow-[0_20px_40px_rgba(0,0,0,0.4)] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <Avatar className="h-full w-full rounded-none">
                                <AvatarImage src={app.iconUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${appId}`} />
                                <AvatarFallback><Zap size={64} className="text-muted-foreground" /></AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 pb-4">
                            <div className="flex flex-col gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase tracking-[0.2em] text-[10px] font-black py-1 px-3">
                                            {app.category} Intelligence
                                        </Badge>
                                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60">
                                            <span>VERIFIED MODULE</span>
                                            <ShieldCheck size={12} className="text-emerald-500" />
                                        </div>
                                    </div>

                                    <h1 className="text-6xl font-black tracking-tighter mb-4 text-white drop-shadow-xl">{app.name}</h1>

                                    <div className="flex items-center gap-6 text-sm font-medium">
                                        <div className="flex items-center gap-2 group cursor-pointer">
                                            <Avatar className="h-6 w-6 ring-2 ring-white/10 group-hover:ring-primary/50 transition-all">
                                                <AvatarImage src={getAvatarUrl(app.creatorWallet)} />
                                                <AvatarFallback>C</AvatarFallback>
                                            </Avatar>
                                            <span className="text-muted-foreground group-hover:text-primary transition-colors font-mono tracking-wide">{app.creatorWallet}</span>
                                        </div>
                                        <span className="text-muted-foreground/20">|</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={14} fill={s <= Math.floor(app.rating ?? 0) ? "#F59E0B" : "none"} stroke={s <= Math.floor(app.rating ?? 0) ? "none" : "#52525B"} />
                                                ))}
                                            </div>
                                            <span className="text-foreground font-bold">{app.rating ?? "New"}</span>
                                        </div>
                                        <span className="text-muted-foreground/20">|</span>
                                        <span className="text-muted-foreground font-mono">{(app.installs ?? 0).toLocaleString()} NODES ACTIVE</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-2">
                                    {(() => {
                                        const appVersion = app.version || "1.0.0";
                                        const isInstalled = installedVersion !== null;
                                        const hasUpdate = isInstalled && installedVersion !== appVersion;

                                        if (isInstalled && !hasUpdate) {
                                            return (
                                                <Button
                                                    size="lg"
                                                    disabled
                                                    className="h-14 min-w-[200px] px-8 text-base font-black uppercase tracking-[0.15em] bg-zinc-800 text-zinc-400 rounded-xl border-2 border-zinc-700 cursor-default"
                                                >
                                                    <span className="flex items-center"><CheckCircle2 size={20} className="mr-3" /> INSTALLED</span>
                                                </Button>
                                            );
                                        }

                                        if (hasUpdate) {
                                            return (
                                                <Button
                                                    size="lg"
                                                    onClick={() => setShowPurchaseModal(true)}
                                                    className="h-14 min-w-[200px] px-8 text-base font-black uppercase tracking-[0.15em] shadow-[0_0_30px_rgba(54,226,123,0.2)] hover:shadow-[0_0_50px_rgba(54,226,123,0.4)] transition-all bg-[#36e27b] text-black hover:bg-[#36e27b] hover:scale-105 active:scale-95 rounded-xl border-2 border-transparent hover:border-white/20"
                                                >
                                                    <span className="flex items-center"><RefreshCw size={20} className="mr-3" /> UPDATE TO v{appVersion}</span>
                                                </Button>
                                            );
                                        }

                                        return (
                                            <Button
                                                size="lg"
                                                onClick={() => setShowPurchaseModal(true)}
                                                className="h-14 min-w-[200px] px-8 text-base font-black uppercase tracking-[0.15em] shadow-[0_0_30px_rgba(54,226,123,0.2)] hover:shadow-[0_0_50px_rgba(54,226,123,0.4)] transition-all bg-[#36e27b] text-black hover:bg-[#36e27b] hover:scale-105 active:scale-95 rounded-xl border-2 border-transparent hover:border-white/20"
                                            >
                                                {app.priceUsdc === 0 ? (
                                                    <span className="flex items-center"><Download size={20} className="mr-3" /> INSTALL MODULE</span>
                                                ) : (
                                                    <span className="flex items-center">ACQUIRE • {app.priceUsdc} SOL</span>
                                                )}
                                            </Button>
                                        );
                                    })()}

                                    <div className="flex flex-col justify-center px-4 h-14 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
                                        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">License Type</span>
                                        <span className="text-xs font-mono text-white">PERPETUAL / ON-CHAIN</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-12">
                        <div className="space-y-12">
                            {/* Visuals / Screenshots */}
                            {app.screenshots && app.screenshots.length > 0 ? (
                                <div className="space-y-3">
                                    {/* Main screenshot */}
                                    <div className="group relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-[#050505]">
                                        <img src={app.screenshots[0]} alt="Screenshot 1" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-muted-foreground text-sm font-mono">v{app.version || "1.0.0"} (Latest Build)</p>
                                        </div>
                                    </div>
                                    {/* Thumbnail row */}
                                    {app.screenshots.length > 1 && (
                                        <div className="grid grid-cols-3 gap-3">
                                            {app.screenshots.slice(1).map((url: string, i: number) => (
                                                <div key={i} className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-[#050505] hover:border-primary/30 transition-colors cursor-pointer">
                                                    <img src={url} alt={`Screenshot ${i + 2}`} className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="group relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-video bg-[#050505]">
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Code size={80} className="text-white/5 group-hover:text-primary/20 transition-colors duration-500" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
                                        <h3 className="text-white font-bold text-lg uppercase tracking-widest mb-1">Interface Preview</h3>
                                        <p className="text-muted-foreground text-sm font-mono">v{app.version || "1.0.0"} (Latest Build)</p>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="prose prose-invert max-w-none">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-3 text-white">
                                    <span className="w-1 h-6 bg-[#36e27b] rounded-full shadow-[0_0_8px_#36e27b]" />
                                    SYSTEM CAPABILITIES
                                </h3>
                                <div className="p-8 rounded-3xl bg-white/5 border border-white/5 leading-loose text-muted-foreground font-light text-lg">
                                    <p className="whitespace-pre-line">{app.description}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Keystone Verified Card */}
                            <div className="rounded-3xl border border-[#36e27b]/20 bg-[#36e27b]/5 backdrop-blur-md p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <ShieldCheck size={100} />
                                </div>
                                <h3 className="font-black text-sm uppercase tracking-[0.2em] text-[#36e27b] mb-4 flex items-center gap-2">
                                    <ShieldCheck size={16} /> Keystone Security
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-1 h-1 rounded-full bg-[#36e27b]" />
                                        <span className="text-zinc-300">Contract Audited</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-1 h-1 rounded-full bg-[#36e27b]" />
                                        <span className="text-zinc-300">Malicious Code Scanned</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-1 h-1 rounded-full bg-[#36e27b]" />
                                        <span className="text-zinc-300">Creator KYC Verified</span>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-[#36e27b]/10 text-[10px] text-[#36e27b]/60 font-mono uppercase">
                                    VERIFICATION ID: #KEY-{app.id.toUpperCase()}
                                </div>
                            </div>

                            {/* Specs Card */}
                            <div className="rounded-3xl border border-white/10 bg-card/20 backdrop-blur-md p-8 space-y-6 sticky top-24">
                                <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Technical Specs</h3>

                                <div className="space-y-5 text-sm font-medium">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-muted-foreground group-hover:text-white transition-colors">Category</span>
                                        <span className="font-mono text-zinc-300">{app.category}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-muted-foreground group-hover:text-white transition-colors">Last Updated</span>
                                        <span className="font-mono text-zinc-300">{app.updatedAt}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-muted-foreground group-hover:text-white transition-colors">Version</span>
                                        <span className="font-mono text-[#36e27b]">{app.version || "1.0.0"}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-muted-foreground group-hover:text-white transition-colors">Framework</span>
                                        <span className="font-mono text-zinc-300">Anchor / React</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PurchaseModal
                open={showPurchaseModal}
                onOpenChange={setShowPurchaseModal}
                app={app}
                onSuccess={() => {
                    toast.success(`"${app.name}" added to your Library`, {
                        action: {
                            label: "Open Library",
                            onClick: () => window.location.href = "/app/library",
                        },
                    });
                }}
            />
        </div>
    );
}
