"use client";

import React from "react";
import { Key, Copy, Eye, Plus, ShieldCheck, History } from "lucide-react";

export const ApiKeysView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#36e27b]/10 flex items-center justify-center text-[#36e27b] border border-[#36e27b]/20">
                        <Key size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">API Access Vault</h2>
                        <p className="text-xs text-[#9eb7a8]">Manage programmatic access keys.</p>
                    </div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-[#36e27b] hover:bg-[#25a85c] text-[#0B0C10] text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(54,226,123,0.3)]">
                    <Plus size={14} /> Generate New Key
                </button>
            </div>

            <div className="bg-[#0F1115] border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="grid grid-cols-12 text-[10px] text-[#9eb7a8] font-bold uppercase tracking-wider">
                        <div className="col-span-4">Key Name</div>
                        <div className="col-span-4">Prefix</div>
                        <div className="col-span-2">Created</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    <KeyRow
                        name="Production Agent 01"
                        prefix="pk_live_..."
                        created="2 days ago"
                        lastUsed="Active now"
                    />
                    <KeyRow
                        name="Staging Testnet"
                        prefix="pk_test_..."
                        created="1 month ago"
                        lastUsed="2h ago"
                        badge="TEST"
                    />
                </div>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="text-yellow-500 mt-0.5" size={16} />
                <div className="space-y-1">
                    <h4 className="text-xs font-bold text-yellow-500">Security Notice</h4>
                    <p className="text-[10px] text-[#9eb7a8] leading-relaxed">
                        Secret keys are only visible once upon creation. Do not share your keys with anyone.
                        Rotate your keys every 90 days for optimal security.
                    </p>
                </div>
            </div>
        </div>
    );
};

const KeyRow = ({ name, prefix, created, lastUsed, badge }: any) => (
    <div className="p-4 grid grid-cols-12 items-center hover:bg-white/[0.02] transition-colors group">
        <div className="col-span-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#1F2833] flex items-center justify-center border border-white/5">
                <Key size={14} className="text-white opacity-50 block rotate-45" />
            </div>
            <div>
                <span className="text-sm font-bold text-white block flex items-center gap-2">
                    {name}
                    {badge && <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-[#9eb7a8] font-mono">{badge}</span>}
                </span>
                <span className="text-[10px] text-[#9eb7a8] flex items-center gap-1">
                    <History size={10} /> Used: {lastUsed}
                </span>
            </div>
        </div>
        <div className="col-span-4 font-mono text-xs text-[#9eb7a8] flex items-center gap-2">
            {prefix} <span className="opacity-30">****************</span>
        </div>
        <div className="col-span-2 text-xs text-[#9eb7a8]">
            {created}
        </div>
        <div className="col-span-2 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 rounded bg-white/5 hover:bg-white/10 text-white transition-colors" title="Copy Key">
                <Copy size={14} />
            </button>
            <button className="p-2 rounded bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 transition-colors" title="Revoke">
                <div className="w-3.5 h-3.5 border-2 border-current rounded-full relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-current -rotate-45 -translate-y-1/2" />
                </div>
            </button>
        </div>
    </div>
);
