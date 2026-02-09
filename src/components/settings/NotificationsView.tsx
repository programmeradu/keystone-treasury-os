"use client";

import React from "react";
import { Bell, ShieldAlert, ShoppingCart, Store, Cpu, Mail, MessageSquare, Trash2 } from "lucide-react";
import { useNotificationStore, type NotificationPreferences } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/lib/toast-notifications";

type PrefKey = keyof NotificationPreferences;

const TOGGLES: { key: keyof NotificationPreferences; icon: any; title: string; desc: string; color: string }[] = [
    {
        key: "security",
        icon: ShieldAlert,
        title: "Critical Security Alerts",
        desc: "Immediate alerts for multisig threshold breaches or suspicious contract interactions.",
        color: "text-destructive",
    },
    {
        key: "purchases",
        icon: ShoppingCart,
        title: "Purchases & Installs",
        desc: "Notifications when you purchase or install an app from the Marketplace.",
        color: "text-emerald-400",
    },
    {
        key: "listings",
        icon: Store,
        title: "Listing Activity",
        desc: "Alerts when your apps are listed, updated, or delisted from the Marketplace.",
        color: "text-primary",
    },
    {
        key: "agentAlerts",
        icon: Cpu,
        title: "Agent Alerts",
        desc: "Real-time status of agent-led autonomous trades and proactive monitoring triggers.",
        color: "text-purple-500",
    },
    {
        key: "system",
        icon: Bell,
        title: "System Notifications",
        desc: "General platform updates, maintenance windows, and new features.",
        color: "text-blue-500",
    },
];

export const NotificationsView = () => {
    const { notifications, preferences, setPreference, clearAll } = useNotificationStore();
    const recentNotifs = [...notifications].reverse().slice(0, 10);

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

            {/* Preference Toggles */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
                {TOGGLES.map(({ key, icon: Icon, title, desc, color }) => (
                    <div key={key} className="p-6 flex items-start gap-4 hover:bg-primary/5 transition-colors group">
                        <div className={`mt-1 p-2 rounded-lg bg-muted border border-border ${color} shadow-sm group-hover:bg-background transition-colors`}>
                            <Icon size={18} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{title}</h3>
                                <button
                                    onClick={() => setPreference(key, !preferences[key])}
                                    className={`w-10 h-5 rounded-full p-1 transition-colors shadow-inner ${preferences[key] ? 'bg-primary' : 'bg-muted'}`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-background shadow-sm transition-transform ${preferences[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg font-black uppercase tracking-widest text-[9px]">
                                {desc}
                            </p>
                        </div>
                    </div>
                ))}
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
                    <button onClick={() => toast.info("Telegram integration coming soon.")} className="text-[10px] font-black text-primary uppercase hover:underline">Connect</button>
                </div>
            </div>

            {/* Recent Notification History */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Recent History</h3>
                    {notifications.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAll} className="h-6 px-2 text-[10px] text-muted-foreground hover:text-red-400 gap-1">
                            <Trash2 size={10} /> Clear All
                        </Button>
                    )}
                </div>
                {recentNotifs.length === 0 ? (
                    <div className="bg-card border border-border rounded-2xl p-8 text-center">
                        <p className="text-xs text-muted-foreground">No notifications yet. Actions like purchases and listings will appear here.</p>
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border shadow-sm">
                        {recentNotifs.map((n) => (
                            <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${n.read ? "opacity-50" : ""}`}>
                                <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" style={{ opacity: n.read ? 0 : 1 }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{n.title}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                                </div>
                                <span className="text-[9px] text-muted-foreground/50 font-mono shrink-0">
                                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
