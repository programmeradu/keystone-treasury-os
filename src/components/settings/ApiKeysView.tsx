"use client";

import React from "react";
import { Key, Copy, Eye, Plus, ShieldCheck, History } from "lucide-react";

export const ApiKeysView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                        <Key size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-foreground uppercase tracking-tight">API Access Vault</h2>
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Manage programmatic access keys.</p>
                    </div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-primary hover:opacity-90 text-primary-foreground text-xs font-black uppercase transition-all flex items-center gap-2 shadow-sm">
                    <Plus size={14} /> Generate New Key
                </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="grid grid-cols-12 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <div className="col-span-4">Key Name</div>
                        <div className="col-span-4">Prefix</div>
                        <div className="col-span-2">Created</div>
                        <div className="col-span-2 text-right">Action</div>
                    </div>
                </div>

                <div className="divide-y divide-border">
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

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 shadow-inner">
                <ShieldCheck className="text-amber-500 mt-0.5" size={16} />
                <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-500 uppercase tracking-tight">Security Notice</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed uppercase tracking-widest font-black">
                        Secret keys are only visible once upon creation. Do not share your keys with anyone.
                        Rotate your keys every 90 days for optimal security.
                    </p>
                </div>
            </div>
        </div>
    );
};

const KeyRow = ({ name, prefix, created, lastUsed, badge }: any) => (
    <div className="p-4 grid grid-cols-12 items-center hover:bg-primary/5 transition-colors group">
        <div className="col-span-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border shadow-sm">
                <Key size={14} className="text-foreground opacity-50 block rotate-45" />
            </div>
            <div>
                <span className="text-sm font-black text-foreground block flex items-center gap-2 uppercase tracking-tight">
                    {name}
                    {badge && <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono font-black uppercase border border-border">{badge}</span>}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-widest font-black">
                    <History size={10} /> Used: {lastUsed}
                </span>
            </div>
        </div>
        <div className="col-span-4 font-mono text-[10px] text-muted-foreground flex items-center gap-2 uppercase font-black">
            {prefix} <span className="opacity-30">****************</span>
        </div>
        <div className="col-span-2 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            {created}
        </div>
        <div className="col-span-2 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-2 rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors border border-border shadow-sm" title="Copy Key">
                <Copy size={14} />
            </button>
            <button className="p-2 rounded bg-muted hover:bg-destructive/20 text-foreground hover:text-destructive transition-colors border border-border shadow-sm" title="Revoke">
                <div className="w-3.5 h-3.5 border-2 border-current rounded-full relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-current -rotate-45 -translate-y-1/2" />
                </div>
            </button>
        </div>
    </div>
);
