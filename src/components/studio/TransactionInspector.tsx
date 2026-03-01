"use client";

/**
 * TransactionInspector — Visual blockchain debugger for Keystone Studio.
 *
 * Displays a visual timeline of transactions executed during the preview session,
 * including impact reports, state diffs, gas estimation, and simulation results.
 *
 * [Phase 8] — Visual Blockchain Debugger
 */

import React, { useState } from "react";
import {
    Activity, ArrowRight, ArrowDown, CheckCircle, AlertTriangle,
    Clock, Hash, Loader2, ChevronDown, ChevronRight, Zap, Shield,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

export interface TransactionEntry {
    id: string;
    timestamp: number;
    type: "swap" | "transfer" | "sign" | "gasless" | "simulation";
    method: string;
    status: "pending" | "confirmed" | "failed";
    signature?: string;
    details: Record<string, unknown>;
    impact?: {
        before: Record<string, number>;
        after: Record<string, number>;
        diff: { symbol: string; delta: number; percentChange: number }[];
    };
    gasEstimate?: number;
    simulationHash?: string;
}

interface TransactionInspectorProps {
    transactions: TransactionEntry[];
    isOpen: boolean;
    onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getTypeIcon(type: TransactionEntry["type"]) {
    switch (type) {
        case "swap": return <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />;
        case "transfer": return <ArrowDown className="w-3.5 h-3.5 text-blue-400" />;
        case "sign": return <Shield className="w-3.5 h-3.5 text-purple-400" />;
        case "gasless": return <Zap className="w-3.5 h-3.5 text-amber-400" />;
        case "simulation": return <Activity className="w-3.5 h-3.5 text-emerald-400" />;
    }
}

function getStatusBadge(status: TransactionEntry["status"]) {
    switch (status) {
        case "confirmed":
            return (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Confirmed
                </span>
            );
        case "failed":
            return (
                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Failed
                </span>
            );
        case "pending":
            return (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" /> Pending
                </span>
            );
    }
}

// ─── Component ──────────────────────────────────────────────────────

export function TransactionInspector({
    transactions,
    isOpen,
    onClose,
}: TransactionInspectorProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (!isOpen) return null;

    return (
        <div className="h-full bg-zinc-950 border-l border-zinc-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Transaction Inspector</h3>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        {transactions.length}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                    Close
                </button>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-auto">
                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <Activity className="w-8 h-8 mb-3 opacity-30" />
                        <p className="text-xs">No transactions yet</p>
                        <p className="text-[10px] text-zinc-700 mt-1">
                            Interact with your Mini-App to see transactions
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-900">
                        {transactions.map((tx) => {
                            const isExpanded = expandedId === tx.id;
                            return (
                                <div key={tx.id} className="group">
                                    {/* Summary Row */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 transition-colors text-left"
                                    >
                                        <div className="shrink-0">
                                            {isExpanded
                                                ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                                                : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                                            }
                                        </div>
                                        <div className="shrink-0">
                                            {getTypeIcon(tx.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-zinc-200 truncate">
                                                {tx.method}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {formatTime(tx.timestamp)}
                                                </span>
                                                {tx.signature && (
                                                    <span className="text-[10px] text-zinc-600 flex items-center gap-1 truncate max-w-[100px]">
                                                        <Hash className="w-3 h-3" /> {tx.signature.slice(0, 12)}…
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {getStatusBadge(tx.status)}
                                    </button>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pl-12 space-y-3">
                                            {/* Impact Diff */}
                                            {tx.impact && tx.impact.diff.length > 0 && (
                                                <div className="bg-zinc-800/50 rounded-lg p-3">
                                                    <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">
                                                        State Diff
                                                    </h4>
                                                    <div className="space-y-1">
                                                        {tx.impact.diff.map((d) => (
                                                            <div key={d.symbol} className="flex items-center justify-between text-xs">
                                                                <span className="text-zinc-400">{d.symbol}</span>
                                                                <span className={d.delta >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                                    {d.delta >= 0 ? "+" : ""}{d.delta.toFixed(4)}
                                                                    <span className="text-zinc-600 ml-1">
                                                                        ({d.percentChange.toFixed(2)}%)
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Gas Estimate */}
                                            {tx.gasEstimate && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-zinc-500">Gas Estimate</span>
                                                    <span className="text-zinc-300 font-mono">
                                                        {tx.gasEstimate.toLocaleString()} lamports
                                                    </span>
                                                </div>
                                            )}

                                            {/* Simulation Hash */}
                                            {tx.simulationHash && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-zinc-500">Simulation</span>
                                                    <code className="text-zinc-400 font-mono text-[10px]">
                                                        {tx.simulationHash.slice(0, 20)}…
                                                    </code>
                                                </div>
                                            )}

                                            {/* Raw Details */}
                                            <details className="group/raw">
                                                <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
                                                    Raw Params
                                                </summary>
                                                <pre className="mt-1 text-[10px] text-zinc-500 font-mono bg-zinc-900 rounded p-2 overflow-auto max-h-32">
                                                    {JSON.stringify(tx.details, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
