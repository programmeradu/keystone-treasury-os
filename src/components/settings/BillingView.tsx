"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, BarChart3, Package, Zap, Store, ShoppingCart } from "lucide-react";
import { Logo } from "@/components/icons";
import { useNotificationStore } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "@/lib/toast-notifications";

interface AppStats {
    appsCreated: number;
    appsListed: number;
    appsPurchased: number;
    totalSpentSol: number;
    totalEarnedSol: number;
}

async function loadStatsFromDb(wallet: string): Promise<AppStats> {
    try {
        const { getProjects, getInstalledApps } = await import("@/actions/studio-actions");
        const projects = await getProjects(wallet);
        const installed = await getInstalledApps(wallet);

        const listed = projects.filter((p: any) => p.isPublished);
        const purchased = installed.filter((a: any) => a.creatorWallet !== wallet);
        const totalEarned = listed.reduce((s: number, a: any) => s + ((a.installs || 0) * parseFloat(a.priceUsdc || "0") * 0.8), 0);
        const totalSpent = purchased.reduce((s: number, a: any) => s + parseFloat(a.priceUsdc || "0"), 0);

        return {
            appsCreated: projects.length,
            appsListed: listed.length,
            appsPurchased: purchased.length,
            totalSpentSol: totalSpent,
            totalEarnedSol: totalEarned,
        };
    } catch {
        return { appsCreated: 0, appsListed: 0, appsPurchased: 0, totalSpentSol: 0, totalEarnedSol: 0 };
    }
}

export const BillingView = () => {
    const [stats, setStats] = useState<AppStats>({ appsCreated: 0, appsListed: 0, appsPurchased: 0, totalSpentSol: 0, totalEarnedSol: 0 });
    const [tier, setTier] = useState<string>("free");
    const [status, setStatus] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    
    const { notifications } = useNotificationStore();
    const { publicKey } = useWallet();

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/fastspring/status');
            const data = await res.json();
            if (data.tier) setTier(data.tier);
            if (data.status) setStatus(data.status);
        } catch (e) {
            console.error("Failed to fetch billing status");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        try {
            const res = await fetch('/api/fastspring/status');
            const data = await res.json();
            if (data.reconciled) {
                toast.success(`Subscription reconciled. Your tier is now: ${data.tier.toUpperCase()}`);
                setTier(data.tier);
            } else if (data.tier === 'free') {
                toast.info("No active subscription found.");
            } else {
                toast.success(`Subscription confirmed: ${data.tier.toUpperCase()} (${data.status})`);
            }
        } catch (e) {
            toast.error("Failed to verify subscription status.");
        } finally {
            setVerifying(false);
        }
    };

    useEffect(() => {
        const wallet = publicKey?.toBase58() || "";
        loadStatsFromDb(wallet).then(setStats);
        fetchStatus();
    }, [publicKey]);

    // Derive purchase history from notifications
    const purchaseNotifs = notifications
        .filter((n) => n.type === "purchase" || n.type === "install")
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                    <CreditCard size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Plan & Usage</h2>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Activity overview and transaction history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Plan */}
                <div className="md:col-span-2 bg-gradient-to-br from-muted to-background border border-border rounded-2xl p-6 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                        <Logo size={150} fillColor="var(--dashboard-foreground)" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Current Plan</h3>
                                <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                                    Keystone OS <span className="text-primary">{tier === 'free' ? 'Base' : tier}</span>
                                </h2>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className={`px-3 py-1 rounded-full ${tier !== 'free' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'} text-[10px] font-black border flex items-center gap-2 uppercase shadow-sm`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${tier !== 'free' ? 'bg-primary animate-pulse shadow-[0_0_8px_var(--dashboard-accent-muted)]' : 'bg-muted-foreground'}`} /> 
                                    {tier !== 'free' ? 'Active' : 'Free Tier'}
                                </div>
                                <button 
                                    onClick={handleVerify}
                                    disabled={verifying}
                                    className="text-[9px] uppercase font-bold text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                                >
                                    {verifying ? "Syncing..." : "Verify Status"}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <FeatureItem text={tier === 'max' ? "Unlimited Agent Personas" : "Up to 5 Agent Personas"} />
                            <FeatureItem text="Marketplace Publishing" />
                            <FeatureItem text="On-Chain Payments (Solana)" />
                            <FeatureItem text="Persistent Notification History" />
                        </div>

                        {tier !== 'max' && (
                            <div className="mb-8">
                                <button 
                                    onClick={() => window.location.href = '/app/billing'}
                                    className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase shadow-[0_0_15px_var(--dashboard-accent-muted)] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    <Zap size={14} /> Upgrade Platform Tier
                                </button>
                            </div>
                        )}

                        {/* Real stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard icon={Package} label="Apps Created" value={stats.appsCreated} />
                            <StatCard icon={Store} label="Listings" value={stats.appsListed} />
                            <StatCard icon={ShoppingCart} label="Purchased" value={stats.appsPurchased} />
                            <StatCard icon={Zap} label="Notifications" value={notifications.length} />
                        </div>
                    </div>
                </div>

                {/* Revenue Summary */}
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                    <div>
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BarChart3 size={14} className="text-primary" /> Revenue
                        </h3>
                        <div className="text-3xl font-black text-foreground mb-1">
                            {stats.totalEarnedSol.toFixed(2)} <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">SOL earned</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">From {stats.appsListed} marketplace listing{stats.appsListed !== 1 ? "s" : ""}</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShoppingCart size={14} className="text-primary" /> Spent
                        </h3>
                        <div className="text-2xl font-black text-foreground mb-1 uppercase tracking-tight">
                            {stats.totalSpentSol.toFixed(2)} <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">SOL total</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Across {stats.appsPurchased} purchase{stats.appsPurchased !== 1 ? "s" : ""}</p>
                    </div>
                </div>
            </div>

            {/* Transaction History */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Transaction History</h3>
                {purchaseNotifs.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-xs text-muted-foreground">No transactions yet. Purchases and installs will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-1 divide-y divide-border">
                        {purchaseNotifs.map((n) => (
                            <div key={n.id} className="flex items-center justify-between p-3 hover:bg-primary/5 rounded-lg transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded bg-muted border border-border text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                                        {n.type === "purchase" ? <ShoppingCart size={14} /> : <Package size={14} />}
                                    </div>
                                    <div>
                                        <span className="text-sm font-black text-foreground block uppercase tracking-tight truncate max-w-[200px]">{n.title}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono font-black uppercase tracking-widest">
                                            {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-primary font-black uppercase tracking-widest">{n.type === "purchase" ? "Purchase" : "Install"}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const FeatureItem = ({ text }: any) => (
    <div className="flex items-center gap-2 text-sm text-foreground/80 font-black uppercase tracking-tight text-[11px]">
        <CheckCircle2 size={16} className="text-primary" /> {text}
    </div>
);

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
    <div className="p-3 rounded-xl bg-muted/20 border border-border text-center shadow-inner">
        <Icon size={16} className="text-primary mx-auto mb-1.5" />
        <div className="text-lg font-black text-foreground">{value}</div>
        <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{label}</div>
    </div>
);
