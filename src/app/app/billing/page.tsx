"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast-notifications";
import { billingCheckoutPath, billingStatusPath } from "@/lib/billing-endpoints";
import { Zap, Shield, Globe, Terminal, User, Cpu, CreditCard, CheckCircle2 } from "lucide-react";

export default function BillingPage() {
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [currentTier, setCurrentTier] = useState("free");

    // Self-hydrate the user's current tier on mount
    useEffect(() => {
        fetch(billingStatusPath())
            .then(res => res.json())
            .then(data => { if (data.tier) setCurrentTier(data.tier); })
            .catch(() => {});
    }, []);

    const handleSubscribe = async (tier: string) => {
        setLoading(true);
        try {
            toast.info(`Initializing ${tier.toUpperCase()} uplink sequence...`);
            const res = await fetch(billingCheckoutPath(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Failed to generate checkout link.");
            }
        } catch(e) {
            toast.error("Failed to establish payment uplink.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setVerifying(true);
        try {
            const res = await fetch(billingStatusPath());
            const data = await res.json();
            if (data.reconciled) {
                toast.success(`Subscription reconciled. Your tier is now: ${data.tier.toUpperCase()}`);
                setTimeout(() => window.location.reload(), 1500);
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

    return (
        <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden font-mono text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">dreyv OS // Subscription Hub</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CreditCard className="text-primary" size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">Billing & Allocations</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={handleVerify}
                        disabled={verifying}
                        className="text-[10px] uppercase font-black border-border hover:border-primary"
                    >
                        {verifying ? "Verifying..." : "Verify Subscription"}
                    </Button>
                    <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-primary">Active Plan: {currentTier}</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-8 overflow-y-auto scrollbar-thin">
                <div className="max-w-[1200px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Free Tier */}
                        <div className={`bg-card border ${currentTier === 'free' ? 'border-primary shadow-[0_0_20px_var(--dashboard-accent-muted)]' : 'border-border'} rounded-2xl p-6 relative overflow-hidden flex flex-col group`}>
                            {currentTier === 'free' && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-black uppercase px-3 py-1 rounded-bl-lg">Active Node</div>}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 border border-primary/30 bg-primary/10 flex items-center justify-center rounded shadow-[0_0_10px_var(--dashboard-accent-muted)]">
                                    <User className="text-primary" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-foreground font-black uppercase tracking-widest text-lg">Base</h3>
                                    <p className="text-muted-foreground text-[10px] uppercase">Free Forever</p>
                                </div>
                            </div>
                            <div className="text-3xl font-black mb-6">$0<span className="text-[12px] text-muted-foreground ml-1">/mo</span></div>
                            
                            <ul className="space-y-4 flex-1 mb-8">
                                {[
                                    "1 Multisig Vault Array",
                                    "Up to 3 Team Operatives",
                                    "Basic Command Prompts",
                                    "Standard Security Routing"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs uppercase font-bold text-muted-foreground">
                                        <CheckCircle2 size={14} className="text-primary" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {currentTier === 'free' ? (
                                <Button disabled className="w-full bg-muted text-muted-foreground text-[10px] font-black uppercase">Current Plan</Button>
                            ) : (
                                <Button className="w-full bg-transparent border border-primary text-primary hover:bg-primary/10 text-[10px] font-black uppercase">Downgrade to Base</Button>
                            )}
                        </div>

                        {/* Mini Tier */}
                        <div className={`bg-card border ${currentTier === 'mini' ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-border'} rounded-2xl p-6 relative overflow-hidden flex flex-col group`}>
                            {currentTier === 'mini' && <div className="absolute top-0 right-0 bg-amber-500 text-amber-950 text-[9px] font-black uppercase px-3 py-1 rounded-bl-lg">Active Node</div>}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 border border-amber-500/30 bg-amber-500/10 flex items-center justify-center rounded shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                    <Shield className="text-amber-500" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-foreground font-black uppercase tracking-widest text-lg">Mini</h3>
                                    <p className="text-muted-foreground text-[10px] uppercase">Growing Squads</p>
                                </div>
                            </div>
                            <div className="text-3xl font-black mb-6">$49<span className="text-[12px] text-muted-foreground ml-1">/mo</span></div>
                            
                            <ul className="space-y-4 flex-1 mb-8">
                                {[
                                    "Up to 5 Multisig Vaults",
                                    "10 Team Operatives / Vault",
                                    "Advanced DCA AI Integrations",
                                    "Custom Webhooks",
                                    "Priority Network Finality"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs uppercase font-bold text-muted-foreground">
                                        <CheckCircle2 size={14} className="text-amber-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {currentTier === 'mini' ? (
                                <Button disabled className="w-full bg-muted text-muted-foreground text-[10px] font-black uppercase">Current Plan</Button>
                            ) : (
                                <Button 
                                    onClick={() => handleSubscribe('mini')} 
                                    disabled={loading}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 text-[10px] font-black uppercase shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
                                >
                                    {loading ? "Intializing..." : "Upgrade to Mini"}
                                </Button>
                            )}
                        </div>

                        {/* Max Tier */}
                        <div className={`bg-card border ${currentTier === 'max' ? 'border-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.2)]' : 'border-border'} rounded-2xl p-6 relative overflow-hidden flex flex-col group`}>
                            {currentTier === 'max' && <div className="absolute top-0 right-0 bg-sky-500 text-sky-950 text-[9px] font-black uppercase px-3 py-1 rounded-bl-lg">Active Node</div>}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 border border-sky-500/30 bg-sky-500/10 flex items-center justify-center rounded shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                                    <Cpu className="text-sky-500" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-foreground font-black uppercase tracking-widest text-lg">Max</h3>
                                    <p className="text-muted-foreground text-[10px] uppercase">Enterprise Nexus</p>
                                </div>
                            </div>
                            <div className="text-3xl font-black mb-6">$199<span className="text-[12px] text-muted-foreground ml-1">/mo</span></div>
                            
                            <ul className="space-y-4 flex-1 mb-8">
                                {[
                                    "Unlimited Multisig Vaults",
                                    "Unlimited Team Operatives",
                                    "Dedicated Backend Compute",
                                    "Whiteglove Integration",
                                    "Automated Treasury Yield",
                                    "Dedicated Node RPCs"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs uppercase font-bold text-muted-foreground">
                                        <CheckCircle2 size={14} className="text-sky-500" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {currentTier === 'max' ? (
                                <Button disabled className="w-full bg-muted text-muted-foreground text-[10px] font-black uppercase">Current Plan</Button>
                            ) : (
                                <Button 
                                    onClick={() => handleSubscribe('max')}
                                    disabled={loading}
                                    className="w-full bg-sky-500 hover:bg-sky-600 text-sky-950 text-[10px] font-black uppercase shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all"
                                >
                                    {loading ? "Intializing..." : "Upgrade to Max"}
                                </Button>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
