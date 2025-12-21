"use client";

import React, { Suspense, useState } from "react";
import { Settings as SettingsIcon, Shield, Bell, Key, Smartphone, Users, Fingerprint, Cpu, Scan, CreditCard, Lock, Zap, Gavel, LayoutGrid } from "lucide-react";
import { RiskProfileSelector } from "@/components/agents/RiskProfileSelector";
import { Logo } from "@/components/icons";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { WalletButton } from "@/components/WalletButton";
import { ProfileView } from "@/components/settings/ProfileView";
import { NotificationsView } from "@/components/settings/NotificationsView";
import { ApiKeysView } from "@/components/settings/ApiKeysView";
import { BillingView } from "@/components/settings/BillingView";
import { NetworkSelector } from "@/components/NetworkSelector";

type SettingsView = "general" | "profile" | "notifications" | "api" | "billing";

export default function SettingsPage() {
    const [currentView, setCurrentView] = useState<SettingsView>("general");

    const renderContent = () => {
        switch (currentView) {
            case "profile": return <ProfileView />;
            case "notifications": return <NotificationsView />;
            case "api": return <ApiKeysView />;
            case "billing": return <BillingView />;
            default: return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Agent Personas Section */}
                    <section className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group shadow-sm">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Cpu size={120} />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Agent Neural Weights</h2>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Configure autonomous behavior and risk thresholds.</p>
                            </div>
                        </div>
                        <RiskProfileSelector />
                    </section>

                    {/* Security Section */}
                    <section className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground border border-border shadow-sm">
                                <Gavel size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Multisig Governance</h2>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Manage signers, thresholds, and timelocks.</p>
                            </div>
                        </div>
                        <div className="rounded-xl bg-muted/10 border border-border p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
                                <Gavel size={32} className="text-muted-foreground opacity-50" />
                            </div>
                            <div className="max-w-sm">
                                <h3 className="text-sm font-black text-foreground mb-1 uppercase">Squads v4 Integration Active</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed uppercase tracking-widest font-black">
                                    Vault policies are immutable and managed directly via the Squads Protocol on-chain.
                                </p>
                            </div>
                            <button className="px-5 py-2.5 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-black uppercase transition-all flex items-center gap-2 shadow-sm">
                                View On-Chain Policy <ExternalIcon />
                            </button>
                        </div>
                    </section>
                </div>
            )
        }
    };
    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground font-mono">
            {/* Standard Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="text-primary" size={20} />
                        <h1 className="text-lg font-black tracking-tight text-foreground uppercase">System Configuration</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NetworkSelector />

                    <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-border mx-1" />

                    <WalletButton />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Column */}
                    {/* Main Column */}
                    <div className="lg:col-span-2">
                        {renderContent()}
                    </div>
                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* Account Settings */}
                        <div className="bg-card border border-border rounded-2xl p-1 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-border">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Account</h3>
                            </div>
                            <nav className="p-2 space-y-1">
                                <SettingsItem
                                    icon={LayoutGrid}
                                    label="System Overview"
                                    active={currentView === "general"}
                                    onClick={() => setCurrentView("general")}
                                />
                                <SettingsItem
                                    icon={Fingerprint}
                                    label="Identity Profile"
                                    active={currentView === "profile"}
                                    onClick={() => setCurrentView("profile")}
                                />
                                <SettingsItem
                                    icon={Bell}
                                    label="Notifications"
                                    badge="2"
                                    active={currentView === "notifications"}
                                    onClick={() => setCurrentView("notifications")}
                                />
                                <SettingsItem
                                    icon={Key}
                                    label="API Keys"
                                    active={currentView === "api"}
                                    onClick={() => setCurrentView("api")}
                                />
                                <SettingsItem
                                    icon={CreditCard}
                                    label="Billing & Plan"
                                    active={currentView === "billing"}
                                    onClick={() => setCurrentView("billing")}
                                />
                            </nav>
                        </div>

                        {/* Mobile App Promo */}
                        <div className="rounded-2xl bg-gradient-to-br from-muted to-background border border-border p-6 relative overflow-hidden group shadow-md">
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground mb-5 shadow-[0_0_20px_var(--dashboard-accent-muted)]">
                                    <Scan size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-black text-foreground mb-2 tracking-tight uppercase">Keystone Mobile</h3>
                                <p className="text-xs text-muted-foreground mb-6 leading-relaxed uppercase tracking-widest font-black">
                                    Securely sign transactions via PWA. Biometric simulation enabled for testing.
                                </p>
                                <button className="w-full py-3 rounded-lg bg-muted/50 hover:bg-muted text-xs font-black text-foreground transition-all border border-border hover:border-primary/20 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_var(--dashboard-accent-muted)] uppercase">
                                    <Smartphone size={14} />
                                    Install PWA
                                </button>
                            </div>

                            {/* Decorative Background */}
                            <div className="absolute top-[-30%] right-[-30%] w-[160%] h-[160%] bg-[radial-gradient(circle_at_50%_50%,rgba(54,226,123,0.08),transparent_70%)] pointer-events-none" />
                            <div className="absolute bottom-0 right-0 p-6 opacity-5 rotate-[-15deg]">
                                <Logo size={120} fillColor="var(--dashboard-foreground)" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsItem({ icon: Icon, label, badge, active, onClick }: any) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-primary/5 text-left group transition-all duration-200 cursor-pointer relative z-10 ${active ? 'bg-primary/20 shadow-[inset_0_0_0_1px_var(--dashboard-accent-muted)]' : ''}`}
        >
            <div className="flex items-center gap-3">
                <Icon size={16} className={`transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={`text-sm font-black uppercase tracking-tight transition-colors ${active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>{label}</span>
            </div>
            {badge ? (
                <span className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-black">
                    {badge}
                </span>
            ) : (
                <div className={`transition-opacity -translate-x-2 duration-200 ${active ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                </div>
            )}
        </button>
    )
}

function ExternalIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    )
}

