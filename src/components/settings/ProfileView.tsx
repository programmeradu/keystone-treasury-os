"use client";

import React from "react";
import { User, Shield, Key, Fingerprint, Award, CreditCard } from "lucide-react";
import { Logo } from "@/components/icons";

export const ProfileView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#36e27b]/10 flex items-center justify-center text-[#36e27b] border border-[#36e27b]/20">
                    <Fingerprint size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Identity Profile</h2>
                    <p className="text-xs text-[#9eb7a8]">Manage your digital identity and access credentials.</p>
                </div>
            </div>

            {/* ID Card */}
            <div className="bg-gradient-to-br from-[#1F2833]/80 to-[#0B0C10] border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Logo size={180} fillColor="#fff" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-white/5 p-1 border border-white/10 relative group-hover:border-[#36e27b]/50 transition-colors">
                            <img
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=KeystoneAdmin"
                                alt="Avatar"
                                className="w-full h-full rounded-full bg-[#0B0C10]"
                            />
                            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#36e27b] border-4 border-[#0B0C10] flex items-center justify-center">
                                <Shield size={10} className="text-[#0B0C10]" fill="currentColor" />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                <h3 className="text-2xl font-bold text-white tracking-tight">Keystone Admin</h3>
                                <span className="px-2 py-0.5 rounded bg-[#36e27b]/20 text-[#36e27b] text-[10px] font-bold uppercase border border-[#36e27b]/10">
                                    Super User
                                </span>
                            </div>
                            <p className="text-sm text-[#9eb7a8] font-mono">0x71C...9A23</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                <span className="text-[10px] text-[#9eb7a8] uppercase font-bold block mb-1">Security Clearance</span>
                                <span className="text-white font-bold flex items-center gap-1.5 justify-center md:justify-start">
                                    <Key size={14} className="text-[#36e27b]" /> Level 5 (Root)
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                                <span className="text-[10px] text-[#9eb7a8] uppercase font-bold block mb-1">Reputation Score</span>
                                <span className="text-white font-bold flex items-center gap-1.5 justify-center md:justify-start">
                                    <Award size={14} className="text-purple-400" /> 98.4 / 100
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Linked Accounts */}
            <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Linked Credentials</h3>
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
                        color="text-[#36e27b]"
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

const CredentialItem = ({ icon: Icon, label, value, status, color = "text-[#9eb7a8]" }: any) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-[#0B0C10] flex items-center justify-center text-[#9eb7a8] group-hover:text-white transition-colors">
                <Icon size={16} />
            </div>
            <div>
                <h4 className="text-sm font-bold text-white">{label}</h4>
                <p className="text-xs text-[#9eb7a8]">{value}</p>
            </div>
        </div>
        <span className={`text-xs font-bold uppercase ${color}`}>{status}</span>
    </div>
);
