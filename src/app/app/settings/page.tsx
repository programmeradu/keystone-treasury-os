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
                    <section className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Cpu size={120} />
                        </div>
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-[#36e27b]/10 flex items-center justify-center text-[#36e27b] border border-[#36e27b]/20 shadow-[0_0_15px_rgba(54,226,123,0.1)]">
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Agent Neural Weights</h2>
                                <p className="text-xs text-[#9eb7a8]">Configure autonomous behavior and risk thresholds.</p>
                            </div>
                        </div>
                        <RiskProfileSelector />
                    </section>

                    {/* Security Section */}
                    <section className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                <Gavel size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Multisig Governance</h2>
                                <p className="text-xs text-[#9eb7a8]">Manage signers, thresholds, and timelocks.</p>
                            </div>
                        </div>
                        <div className="rounded-xl bg-black/40 border border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                <Gavel size={32} className="text-[#9eb7a8] opacity-50" />
                            </div>
                            <div className="max-w-sm">
                                <h3 className="text-sm font-bold text-white mb-1">Squads v4 Integration Active</h3>
                                <p className="text-[#9eb7a8] text-xs leading-relaxed">
                                    Vault policies are immutable and managed directly via the Squads Protocol on-chain.
                                </p>
                            </div>
                            <button className="px-5 py-2.5 rounded-lg bg-[#36e27b] hover:bg-[#25a85c] text-[#0B0C10] text-xs font-bold transition-all flex items-center gap-2">
                                View On-Chain Policy <ExternalIcon />
                            </button>
                        </div>
                    </section>
                </div>
            )
        }
    };
    return (
        <div className="flex flex-col h-screen bg-[#0B0C10] overflow-hidden">
            {/* Standard Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0C10]/50 backdrop-blur-md z-10">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_#36e27b]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9eb7a8]">Keystone OS // Primary Node</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="text-[#36e27b]" size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-white uppercase">System Configuration</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1F2833]/40 border border-white/5 hover:bg-white/5 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_rgba(54,226,123,0.5)]" />
                        <span className="text-xs font-medium text-white">Devnet</span>
                    </button>

                    <Suspense fallback={<div className="h-8 w-24 bg-white/5 animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>

                    <div className="w-px h-6 bg-white/5 mx-1" />

                    <WalletButton />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Agent Personas Section */}
                        <section className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Cpu size={120} />
                            </div>
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-[#36e27b]/10 flex items-center justify-center text-[#36e27b] border border-[#36e27b]/20 shadow-[0_0_15px_rgba(54,226,123,0.1)]">
                                    <Cpu size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Agent Neural Weights</h2>
                                    <p className="text-xs text-[#9eb7a8]">Configure autonomous behavior and risk thresholds.</p>
                                </div>
                            </div>
                            <RiskProfileSelector />
                        </section>

                        {/* Security Section */}
                        <section className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                    <Gavel size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Multisig Governance</h2>
                                    <p className="text-xs text-[#9eb7a8]">Manage signers, thresholds, and timelocks.</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-black/40 border border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                    <Gavel size={32} className="text-[#9eb7a8] opacity-50" />
                                </div>
                                <div className="max-w-sm">
                                    <h3 className="text-sm font-bold text-white mb-1">Squads v4 Integration Active</h3>
                                    <p className="text-[#9eb7a8] text-xs leading-relaxed">
                                        Vault policies are immutable and managed directly via the Squads Protocol on-chain.
                                    </p>
                                </div>
                                <button className="px-5 py-2.5 rounded-lg bg-[#36e27b] hover:bg-[#25a85c] text-[#0B0C10] text-xs font-bold transition-all flex items-center gap-2">
                                    View On-Chain Policy <ExternalIcon />
                                </button>
                            </div>
                        </section>

                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                        {/* Account Settings */}
                        <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-1 overflow-hidden">
                            <div className="px-5 py-4 border-b border-white/5">
                                <h3 className="text-xs font-bold text-[#9eb7a8] uppercase tracking-widest">Account</h3>
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
                        <div className="rounded-2xl bg-gradient-to-br from-[#1F2833] to-[#0B0C10] border border-white/5 p-6 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-[#36e27b] flex items-center justify-center text-[#0B0C10] mb-5 shadow-[0_0_20px_rgba(54,226,123,0.3)]">
                                    <Scan size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Keystone Mobile</h3>
                                <p className="text-xs text-[#9eb7a8] mb-6 leading-relaxed">
                                    Securely sign transactions via PWA. Biometric simulation enabled for testing.
                                </p>
                                <button className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all border border-white/5 hover:border-white/20 flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                    <Smartphone size={14} />
                                    Install PWA
                                </button>
                            </div>

                            {/* Decorative Background */}
                            <div className="absolute top-[-30%] right-[-30%] w-[160%] h-[160%] bg-[radial-gradient(circle_at_50%_50%,rgba(54,226,123,0.08),transparent_70%)] pointer-events-none" />
                            <div className="absolute bottom-0 right-0 p-6 opacity-5 rotate-[-15deg]">
                                <Logo size={120} fillColor="#fff" />
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
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 text-left group transition-all duration-200 ${active ? 'bg-white/5' : ''}`}
        >
            <div className="flex items-center gap-3">
                <Icon size={16} className={`transition-colors ${active ? 'text-white' : 'text-[#9eb7a8] group-hover:text-white'}`} />
                <span className={`text-sm font-medium transition-colors ${active ? 'text-white' : 'text-[#9eb7a8] group-hover:text-white'}`}>{label}</span>
            </div>
            {badge ? (
                <span className="px-1.5 py-0.5 rounded bg-[#36e27b] text-[#0B0C10] text-[10px] font-bold">
                    {badge}
                </span>
            ) : (
                <div className={`transition-opacity -translate-x-2 duration-200 ${active ? 'opacity-100 translate-x-0' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b]" />
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
