"use client";

import React, { useState } from "react";
import { Bell, Zap, ShieldAlert, BadgeDollarSign, Mail, MessageSquare } from "lucide-react";

export const NotificationsView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#36e27b]/10 flex items-center justify-center text-[#36e27b] border border-[#36e27b]/20">
                    <Bell size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Signal Intelligence</h2>
                    <p className="text-xs text-[#9eb7a8]">Configure alert sensitivity and signal channels.</p>
                </div>
            </div>

            <div className="bg-[#0F1115] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                <NotificationToggle
                    icon={ShieldAlert}
                    title="Critical Security Alerts"
                    desc="Immediate push notifications for multisig threshold breaches or suspicious contract interactions."
                    defaultChecked={true}
                    color="text-red-400"
                />
                <NotificationToggle
                    icon={Zap}
                    title="Flash Execution Updates"
                    desc="Real-time status of agent-led autonomous trades and rebalancing events."
                    defaultChecked={true}
                    color="text-[#36e27b]"
                />
                <NotificationToggle
                    icon={BadgeDollarSign}
                    title="Whale Watch"
                    desc="Alerts when significant capital (> $100k) moves into tracked asset pools."
                    defaultChecked={false}
                    color="text-blue-400"
                />
                <NotificationToggle
                    icon={MessageSquare}
                    title="Governance Proposals"
                    desc="New DAO proposals requiring voting participation."
                    defaultChecked={true}
                    color="text-purple-400"
                />
            </div>

            {/* Channels */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0F1115] border border-white/5 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Mail className="text-[#9eb7a8]" size={18} />
                        <div>
                            <span className="text-xs font-bold text-white block">Email Digest</span>
                            <span className="text-[10px] text-[#9eb7a8]">Daily Summary</span>
                        </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-[#36e27b]" />
                </div>
                <div className="bg-[#0F1115] border border-white/5 p-4 rounded-xl flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-black text-black">T</span>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-white block">Telegram Bot</span>
                            <span className="text-[10px] text-[#9eb7a8]">Not Connected</span>
                        </div>
                    </div>
                    <button className="text-[10px] font-bold text-[#36e27b] uppercase">Connect</button>
                </div>
            </div>
        </div>
    );
};

const NotificationToggle = ({ icon: Icon, title, desc, defaultChecked, color }: any) => {
    const [enabled, setEnabled] = useState(defaultChecked);

    return (
        <div className="p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
            <div className={`mt-1 p-2 rounded-lg bg-white/5 ${color}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <button
                        onClick={() => setEnabled(!enabled)}
                        className={`w-10 h-5 rounded-full p-1 transition-colors ${enabled ? 'bg-[#36e27b]' : 'bg-white/10'}`}
                    >
                        <div className={`w-3 h-3 rounded-full bg-[#0B0C10] shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                <p className="text-xs text-[#9eb7a8] leading-relaxed max-w-lg">
                    {desc}
                </p>
            </div>
        </div>
    )
}
