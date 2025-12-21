"use client";

import React, { useState } from "react";
import { Bell, Zap, ShieldAlert, BadgeDollarSign, Mail, MessageSquare } from "lucide-react";

export const NotificationsView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                    <Bell size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Signal Intelligence</h2>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Configure alert sensitivity and signal channels.</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
                <NotificationToggle
                    icon={ShieldAlert}
                    title="Critical Security Alerts"
                    desc="Immediate push notifications for multisig threshold breaches or suspicious contract interactions."
                    defaultChecked={true}
                    color="text-destructive"
                />
                <NotificationToggle
                    icon={Zap}
                    title="Flash Execution Updates"
                    desc="Real-time status of agent-led autonomous trades and rebalancing events."
                    defaultChecked={true}
                    color="text-primary"
                />
                <NotificationToggle
                    icon={BadgeDollarSign}
                    title="Whale Watch"
                    desc="Alerts when significant capital (> $100k) moves into tracked asset pools."
                    defaultChecked={false}
                    color="text-blue-500"
                />
                <NotificationToggle
                    icon={MessageSquare}
                    title="Governance Proposals"
                    desc="New DAO proposals requiring voting participation."
                    defaultChecked={true}
                    color="text-purple-500"
                />
            </div>

            {/* Channels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <Mail className="text-muted-foreground" size={18} />
                        <div>
                            <span className="text-xs font-black text-foreground block uppercase">Email Digest</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black">Daily Summary</span>
                        </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                </div>
                <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between opacity-50 shadow-sm border-dashed">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-foreground rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-black text-background">T</span>
                        </div>
                        <div>
                            <span className="text-xs font-black text-foreground block uppercase">Telegram Bot</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black">Not Connected</span>
                        </div>
                    </div>
                    <button className="text-[10px] font-black text-primary uppercase">Connect</button>
                </div>
            </div>
        </div>
    );
};

const NotificationToggle = ({ icon: Icon, title, desc, defaultChecked, color }: any) => {
    const [enabled, setEnabled] = useState(defaultChecked);

    return (
        <div className="p-6 flex items-start gap-4 hover:bg-primary/5 transition-colors group">
            <div className={`mt-1 p-2 rounded-lg bg-muted border border-border ${color} shadow-sm group-hover:bg-background transition-colors`}>
                <Icon size={18} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{title}</h3>
                    <button
                        onClick={() => setEnabled(!enabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-colors shadow-inner ${enabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                        <div className={`w-3 h-3 rounded-full bg-background shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-lg font-black uppercase tracking-widest text-[9px]">
                    {desc}
                </p>
            </div>
        </div>
    )
}
