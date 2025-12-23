"use client";

import React, { useState } from "react";
import { Download, FileText, Filter, Calendar, Search, CheckCircle2, AlertCircle } from "lucide-react";

const COMPLIANCE_LOGS = [
    { id: "TX_9921", date: "2024-12-20", type: "OUTFLOW", entity: "Contributor_Grant_Pool", amount: "50,000 USDC", status: "VERIFIED", hash: "5x...92a" },
    { id: "TX_9920", date: "2024-12-19", type: "INFLOW", entity: "Kamino_Yield_Strategy", amount: "1,240.52 USDC", status: "VERIFIED", hash: "2a...b11" },
    { id: "TX_9919", date: "2024-12-18", type: "SWAP", entity: "Jupiter_Aggregator", amount: "500 SOL -> 32,500 USDC", status: "VERIFIED", hash: "9c...22f" },
    { id: "TX_9918", date: "2024-12-18", type: "VOTE", entity: "Realms_Governance", amount: "---", status: "EXECUTED", hash: "1d...44a" },
    { id: "TX_9917", date: "2024-12-15", type: "OUTFLOW", entity: "Security_Audit_Firm_A", amount: "12,500 USDC", status: "PENDING_AUDIT", hash: "7b...33e" },
];

export function DataNexus() {
    return (
        <div className="flex flex-col h-full gap-2">
            {/* 1. Export Command Station - Flattened Toolbar */}
            <div className="flex items-center justify-between px-4 pt-2">
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                        <FileText size={14} /> Month Report
                    </button>
                    <div className="h-8 w-px bg-zinc-800 mx-1" />
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] uppercase font-bold text-emerald-500 hover:text-emerald-400 transition-all">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* 2. Compliance Ledger - Full Bleed */}
            <div className="flex-1 flex flex-col overflow-hidden relative border-t border-zinc-800/50 mt-2">
                {/* Decorative Header */}
                <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] uppercase font-mono font-bold text-zinc-500 tracking-widest">Real-Time Ledger Sync</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-400 hover:text-white transition-colors">
                            <Calendar size={10} /> Dec 2024
                        </button>
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" size={10} />
                            <input
                                className="h-7 w-40 bg-zinc-900 border border-zinc-800 rounded pl-7 pr-2 text-[9px] font-mono text-white focus:outline-none focus:border-zinc-700 transition-colors"
                                placeholder="Filter hash..."
                            />
                        </div>
                    </div>
                </div>

                {/* Terminal List */}
                <div className="flex-1 overflow-x-auto scrollbar-thin font-mono bg-zinc-900/10">
                    <div className="min-w-[800px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[9px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
                                    <th className="py-2 pl-4 font-normal">Transaction ID</th>
                                    <th className="py-2 font-normal">Date</th>
                                    <th className="py-2 font-normal">Type</th>
                                    <th className="py-2 font-normal">Entity / Contract</th>
                                    <th className="py-2 font-normal">Value Vector</th>
                                    <th className="py-2 font-normal">Status</th>
                                    <th className="py-2 font-normal">Hash</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px] text-zinc-400">
                                {COMPLIANCE_LOGS.map((log) => (
                                    <tr key={log.id} className="group hover:bg-zinc-900/50 transition-colors text-[10px]">
                                        <td className="py-3 pl-4 border-b border-zinc-900/50 text-white font-bold">{log.id}</td>
                                        <td className="py-3 border-b border-zinc-900/50 opacity-70">{log.date}</td>
                                        <td className="py-3 border-b border-zinc-900/50">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${log.type === "INFLOW" ? "bg-emerald-500/10 text-emerald-500" :
                                                log.type === "OUTFLOW" ? "bg-rose-500/10 text-rose-500" :
                                                    "bg-zinc-800 text-zinc-400"
                                                }`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="py-3 border-b border-zinc-900/50 text-white font-mono">{log.entity}</td>
                                        <td className="py-3 border-b border-zinc-900/50 font-bold">{log.amount}</td>
                                        <td className="py-3 border-b border-zinc-900/50">
                                            <div className="flex items-center gap-1.5">
                                                {log.status === "VERIFIED" || log.status === "EXECUTED" ? <CheckCircle2 size={10} className="text-emerald-500" /> : <AlertCircle size={10} className="text-orange-500" />}
                                                <span className={log.status === "VERIFIED" || log.status === "EXECUTED" ? "text-emerald-500" : "text-orange-500"}>{log.status}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 border-b border-zinc-900/50 font-mono opacity-50 underline decoration-zinc-800 cursor-pointer hover:text-primary transition-colors">{log.hash}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Terminal List is already rendered above, removing duplicate */}
        </div>
    );
}

