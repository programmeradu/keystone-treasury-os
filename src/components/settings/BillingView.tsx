"use client";

import React from "react";
import { CreditCard, CheckCircle2, BarChart3, Download, Zap } from "lucide-react";
import { Logo } from "@/components/icons";

export const BillingView = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#36e27b]/10 flex items-center justify-center text-[#36e27b] border border-[#36e27b]/20">
                    <CreditCard size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Plan & Billing</h2>
                    <p className="text-xs text-[#9eb7a8]">Manage subscription tier and payment history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Plan */}
                <div className="md:col-span-2 bg-gradient-to-br from-[#1F2833] to-[#0B0C10] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12">
                        <Logo size={150} fillColor="#fff" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xs font-bold text-[#9eb7a8] uppercase tracking-widest mb-1">Current Plan</h3>
                                <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                                    Keystone OS <span className="text-[#36e27b]">Pro</span>
                                </h2>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-[#36e27b]/20 text-[#36e27b] text-xs font-bold border border-[#36e27b]/20 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#36e27b] animate-pulse" /> Active
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <FeatureItem text="Unlimited Agent Personas" />
                            <FeatureItem text="Priority RPC Nodes (100ms latency)" />
                            <FeatureItem text="Advanced Risk Analytics" />
                            <FeatureItem text="24/7 Dedicated Support" />
                        </div>

                        <div className="flex gap-4">
                            <button className="px-6 py-2.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-gray-200 transition-colors">
                                Manage Subscription
                            </button>
                            <button className="px-6 py-2.5 rounded-lg bg-transparent border border-white/10 text-white font-bold text-xs hover:bg-white/5 transition-colors">
                                Change Plan
                            </button>
                        </div>
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold text-[#9eb7a8] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BarChart3 size={14} /> RPC Usage
                        </h3>
                        <div className="text-3xl font-black text-white mb-1">
                            842k <span className="text-sm font-medium text-[#9eb7a8]">/ 1M reqs</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-[#36e27b] w-[84%]" />
                        </div>
                        <p className="text-[10px] text-[#9eb7a8]">Resets in 12 days</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5">
                        <h3 className="text-xs font-bold text-[#9eb7a8] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Zap size={14} /> Compute Credits
                        </h3>
                        <div className="text-2xl font-black text-white mb-1">
                            $42.50 <span className="text-sm font-medium text-[#9eb7a8]">remaining</span>
                        </div>
                        <button className="text-[10px] text-[#36e27b] font-bold hover:underline">Top Up Credits &rarr;</button>
                    </div>
                </div>
            </div>

            {/* Invoices */}
            <div className="bg-[#0F1115] border border-white/5 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-[#9eb7a8] uppercase tracking-widest mb-4">Payment History</h3>
                <div className="space-y-1">
                    <InvoiceRow date="Dec 01, 2024" amount="$299.00" status="Paid" id="INV-2024-001" />
                    <InvoiceRow date="Nov 01, 2024" amount="$299.00" status="Paid" id="INV-2024-002" />
                    <InvoiceRow date="Oct 01, 2024" amount="$299.00" status="Paid" id="INV-2024-003" />
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ text }: any) => (
    <div className="flex items-center gap-2 text-sm text-white/80">
        <CheckCircle2 size={16} className="text-[#36e27b]" /> {text}
    </div>
);

const InvoiceRow = ({ date, amount, status, id }: any) => (
    <div className="flex items-center justify-between p-3 hover:bg-white/[0.02] rounded-lg transition-colors group">
        <div className="flex items-center gap-4">
            <div className="p-2 rounded bg-white/5 text-[#9eb7a8]">
                <Download size={14} />
            </div>
            <div>
                <span className="text-sm font-bold text-white block">Keystone OS Pro</span>
                <span className="text-[10px] text-[#9eb7a8] font-mono">{date} • {id}</span>
            </div>
        </div>
        <div className="text-right">
            <span className="text-sm font-bold text-white block">{amount}</span>
            <span className="text-[10px] text-[#36e27b] font-bold uppercase">{status}</span>
        </div>
    </div>
);
