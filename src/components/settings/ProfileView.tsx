"use client";

import React from "react";
import { User, Shield, Key, Fingerprint, Award, CreditCard } from "lucide-react";
import { Logo } from "@/components/icons";

export const ProfileView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                    <Fingerprint size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Identity Profile</h2>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Manage your digital identity and access credentials.</p>
                </div>
            </div>

            {/* ID Card */}
            <div className="bg-gradient-to-br from-muted to-background border border-border rounded-2xl p-8 relative overflow-hidden group shadow-md">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Logo size={180} fillColor="#fff" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-muted p-1 border border-border relative group-hover:border-primary/50 transition-colors shadow-inner">
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=KeystoneAdmin"
                                alt="Avatar"
                                className="w-full h-full rounded-full bg-background"
                            />
                            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary border-4 border-background flex items-center justify-center">
                                <Shield size={10} className="text-primary-foreground" fill="currentColor" />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h3 className="text-2xl font-black text-foreground tracking-tight uppercase">Keystone Admin</h3>
                                <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-black uppercase border border-primary/10 shadow-sm">
                                    Super User
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono font-black uppercase tracking-widest">0x71C...9A23</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-muted/20 border border-border shadow-inner">
                                <span className="text-[10px] text-muted-foreground uppercase font-black block mb-1">Security Clearance</span>
                                <span className="text-foreground font-black uppercase flex items-center gap-1.5 justify-center md:justify-start text-xs">
                                    <Key size={14} className="text-primary" /> Level 5 (Root)
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/20 border border-border shadow-inner">
                                <span className="text-[10px] text-muted-foreground uppercase font-black block mb-1">Reputation Score</span>
                                <span className="text-foreground font-black uppercase flex items-center gap-1.5 justify-center md:justify-start text-xs">
                                    <Award size={14} className="text-purple-500" /> 98.4 / 100
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Linked Accounts */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">Linked Credentials</h3>
                <div className="space-y-3">
                    <CredentialItem
                        icon={Shield}
                        label="Ethereum Wallet"
                        value="Connect Ledger or Trezor"
                        status="Active"
                    />
                    <CredentialItem
                        icon={User}
                        label="Social Recovery"
                        value="3 Guardians Set"
                        status="Secure"
                        color="text-primary"
                    />
                    <CredentialItem
                        icon={CreditCard}
                        label="Corporate Card"
                        value="Brex ending in 4242"
                        status="Linked"
                    />
                </div>
            </div>
        </div>
    );
};

const CredentialItem = ({ icon: Icon, label, value, status, color = "text-muted-foreground" }: any) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/10 hover:bg-muted/30 border border-border transition-colors group shadow-sm">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors border border-border">
                <Icon size={16} />
            </div>
            <div>
                <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{label}</h4>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-black text-[9px]">{value}</p>
            </div>
        </div>
        <span className={`text-xs font-black uppercase ${color}`}>{status}</span>
    </div>
);
