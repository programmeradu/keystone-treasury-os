"use client";

import React from "react";
import { CreditCard, CheckCircle2, BarChart3, Download, Zap } from "lucide-react";
import { Logo } from "@/components/icons";

export const BillingView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_15px_var(--dashboard-accent-muted)]">
                    <CreditCard size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Plan & Billing</h2>
                    <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">Manage subscription tier and payment history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Plan */}
                <div className="md:col-span-2 bg-gradient-to-br from-muted to-background border border-border rounded-2xl p-6 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                        <Logo size={150} fillColor="var(--dashboard-foreground)" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Current Plan</h3>
                                <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                                    Keystone OS <span className="text-primary">Pro</span>
                                </h2>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black border border-primary/20 flex items-center gap-2 uppercase shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--dashboard-accent-muted)]" /> Active
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <FeatureItem text="Unlimited Agent Personas" />
                            <FeatureItem text="Priority RPC Nodes (100ms latency)" />
                            <FeatureItem text="Advanced Risk Analytics" />
                            <FeatureItem text="24/7 Dedicated Support" />
                        </div>

                        <div className="flex gap-4">
                            <button className="px-6 py-2.5 rounded-lg bg-foreground text-background font-black text-xs hover:opacity-90 transition-all shadow-sm uppercase">
                                Manage Subscription
                            </button>
                            <button className="px-6 py-2.5 rounded-lg bg-muted border border-border text-foreground font-black text-xs hover:bg-muted/80 transition-all shadow-sm uppercase">
                                Change Plan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                    <div>
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BarChart3 size={14} className="text-primary" /> RPC Usage
                        </h3>
                        <div className="text-3xl font-black text-foreground mb-1">
                            842k <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">/ 1M reqs</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2 shadow-inner">
                            <div className="h-full bg-primary" style={{ width: '84.2%' }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Resets in 12 days</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={14} className="text-primary" /> Compute Credits
                        </h3>
                        <div className="text-2xl font-black text-foreground mb-1 uppercase tracking-tight">
                            $42.50 <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">remaining</span>
                        </div>
                        <button className="text-[10px] text-primary font-black hover:underline uppercase tracking-widest">Top Up Credits &rarr;</button>
                    </div>
                </div>
            </div>

            {/* Invoices */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Payment History</h3>
                <div className="space-y-1 divide-y divide-border">
                    <InvoiceRow date="Dec 01, 2024" amount="$299.00" status="Paid" id="INV-2024-001" />
                    <InvoiceRow date="Nov 01, 2024" amount="$299.00" status="Paid" id="INV-2024-002" />
                    <InvoiceRow date="Oct 01, 2024" amount="$299.00" status="Paid" id="INV-2024-003" />
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ text }: any) => (
    <div className="flex items-center gap-2 text-sm text-foreground/80 font-black uppercase tracking-tight text-[11px]">
        <CheckCircle2 size={16} className="text-primary" /> {text}
    </div>
);

const InvoiceRow = ({ date, amount, status, id }: any) => (
    <div className="flex items-center justify-between p-3 hover:bg-primary/5 rounded-lg transition-all group">
        <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-muted border border-border text-muted-foreground group-hover:text-primary transition-colors shadow-sm">
                <Download size={14} />
            </div>
            <div>
                <span className="text-sm font-black text-foreground block uppercase tracking-tight">Keystone OS Pro</span>
                <span className="text-[10px] text-muted-foreground font-mono font-black uppercase tracking-widest">{date} • {id}</span>
            </div>
        </div>
        <div className="text-right">
            <span className="text-sm font-black text-foreground block uppercase tracking-tight">{amount}</span>
            <span className="text-[10px] text-primary font-black uppercase tracking-widest">{status}</span>
        </div>
    </div>
);
