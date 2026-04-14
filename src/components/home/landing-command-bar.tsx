"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useTransactionExecutor } from "@/lib/hooks/useTransactionExecutor";
import { toast } from "@/lib/toast-notifications";

export function LandingCommandBar() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [executing, setExecuting] = useState(false);
    const txExecutor = useTransactionExecutor();

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                setPlan(null);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const executeCommand = async () => {
        if (!input.trim() || loading) return;
        setLoading(true);
        try {
            const res = await fetch("/api/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: input }),
            });
            const data = await res.json();

            if (data.plan && data.plan.actions) {
                if (data.execution) {
                    data.plan._execution = data.execution;
                    data.plan._mode = data.mode;
                }
                setPlan(data.plan);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!plan) return;
        setExecuting(true);
        try {
            const firstAction = plan.actions?.[0];
            const op = firstAction?.operation?.toLowerCase() || "";

            // ─── Swap → wallet sign or Squads proposal ─────────────
            if (op === "swap" && firstAction?.parameters) {
                if (!txExecutor.isWalletConnected && !txExecutor.isMultisig) {
                    toast.error("Wallet Not Connected", {
                        description: "Connect a wallet to sign this transaction.",
                    });
                    return;
                }
                const result = await txExecutor.executeSwap({
                    inputToken: firstAction.parameters.inputToken || "SOL",
                    outputToken: firstAction.parameters.outputToken || "USDC",
                    amount: firstAction.parameters.amount || 0,
                });
                if (!result.success) throw new Error(result.error);
            }
            // ─── Transfer → wallet sign or Squads proposal ─────────
            else if (op === "transfer" && firstAction?.parameters) {
                if (!txExecutor.isWalletConnected && !txExecutor.isMultisig) {
                    toast.error("Wallet Not Connected", {
                        description: "Connect a wallet to sign this transaction.",
                    });
                    return;
                }
                const result = await txExecutor.executeTransfer({
                    recipient: firstAction.parameters.recipient,
                    token: firstAction.parameters.token || "SOL",
                    amount: firstAction.parameters.amount || 0,
                });
                if (!result.success) throw new Error(result.error);
            }
            // ─── Other tx ops → proposal or toast ──────────────────
            else if (["bridge", "yield_deposit", "yield_withdraw", "rebalance", "stake"].includes(op)) {
                if (txExecutor.isMultisig) {
                    const result = await txExecutor.createProposal(
                        `${op}: ${JSON.stringify(firstAction.parameters)}`
                    );
                    if (!result.success) throw new Error(result.error);
                } else if (!txExecutor.isWalletConnected) {
                    toast.error("Wallet Not Connected", {
                        description: "Connect a wallet to execute this action.",
                    });
                    return;
                } else if (plan._execution?.serializedTransactions && plan._execution.serializedTransactions.length > 0) {
                    // Try to execute serialized transactions if the API returned them
                    for (const tx of plan._execution.serializedTransactions) {
                        const result = await txExecutor.executeRawTransaction(tx);
                        if (!result.success) throw new Error(result.error);
                    }
                } else {
                    toast.error("Action Queued", {
                        description: `Execution engine for ${op} is not fully integrated for individual wallets yet. Action skipped.`,
                    });
                }
            }

            setOpen(false);
            setPlan(null);
            setInput("");
        } catch (error: any) {
            console.error("Execution failed:", error);
            toast.error("Execution Failed", {
                description: error.message || "Check console for details.",
            });
        } finally {
            setExecuting(false);
        }
    };

    return (
        <>
            {/* Inline trigger — same style as in-app CommandBar */}
            <button
                onClick={() => setOpen(true)}
                className="mt-6 flex items-center gap-3 pl-4 pr-3 py-3 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-2xl hover:border-dreyv-green/30 hover:shadow-[0_0_20px_rgba(54,226,123,0.1)] transition-all group"
            >
                <Sparkles size={16} className="text-dreyv-green" />
                <span className="text-sm font-medium text-white/40 group-hover:text-white/70 transition-colors mr-2">
                    Ask dreyv...
                </span>
                <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-white/30 border-l border-white/[0.08] pl-3">
                    <span>⌘</span> K
                </div>
            </button>

            {/* Expanded modal — identical to in-app CommandBar */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        {/* Click outside to close */}
                        <div className="absolute inset-0" onClick={() => { setOpen(false); setPlan(null); }} />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="relative w-full max-w-2xl bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Neon Glow Border Effect */}
                            <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-dreyv-green/20" />
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-dreyv-green to-[#25a85c] rounded-2xl blur opacity-20" />

                            <div className="relative z-10 flex flex-col">
                                {!plan ? (
                                    /* INPUT STATE */
                                    <>
                                        <div className="flex items-center px-6 py-5 border-b border-white/[0.06]">
                                            <Sparkles size={20} className={`text-dreyv-green mr-4 ${loading ? "animate-spin" : ""}`} />
                                            <input
                                                autoFocus
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && executeCommand()}
                                                disabled={loading}
                                                placeholder="Describe your intent (e.g., 'Swap 50k USDC to SOL')..."
                                                className="flex-1 bg-transparent text-lg font-medium text-white placeholder:text-white/25 outline-none"
                                            />
                                        </div>

                                        <div className="px-6 py-3 bg-white/[0.02] flex items-center justify-between text-[10px] text-white/30">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full bg-dreyv-green ${loading ? "animate-ping" : "animate-pulse"}`} />
                                                <span className="font-mono">{loading ? "THINKING..." : "AI AGENT LISTENING"}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span>Press <strong className="text-white/60">Enter</strong> to execute</span>
                                                <span><strong className="text-white/60">Esc</strong> to close</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* PLAN REVIEW STATE */
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-dreyv-green/10 border border-dreyv-green/20">
                                                    <Sparkles size={16} className="text-dreyv-green" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                                        Proposed {plan.actions?.length > 1 ? "Workflow" : "Action"}
                                                    </h3>
                                                    <p className="text-xs text-white/40">
                                                        {plan.actions?.length || 1} step{plan.actions?.length > 1 ? "s" : ""} prepared
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1 rounded bg-dreyv-green/10 border border-dreyv-green/20 text-dreyv-green text-[10px] font-mono uppercase">
                                                {plan.operation}
                                            </div>
                                        </div>

                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-4">
                                            {plan.actions?.map((action: any, idx: number) => (
                                                <div key={idx} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                                    <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2">
                                                        <span className="text-[10px] font-bold text-dreyv-green uppercase tracking-tighter">Step {idx + 1}</span>
                                                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] font-mono text-white/40 uppercase">{action.operation}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                        {Object.entries(action.parameters || {}).map(([key, value]) => (
                                                            <div key={key}>
                                                                <span className="text-[9px] text-white/30 uppercase block">{key}</span>
                                                                <span className="text-xs text-white/70 font-mono truncate block">{String(value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06] border-l-2 border-l-dreyv-green">
                                                <span className="text-[10px] text-dreyv-green uppercase font-bold block mb-1">Agent Strategy</span>
                                                <p className="text-sm text-white/70 italic leading-relaxed">{plan.estimatedOutcome}</p>
                                            </div>
                                        </div>

                                        {plan.warnings && plan.warnings.length > 0 && (
                                            <div className="mb-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                                <ul className="list-disc list-inside text-xs text-orange-400">
                                                    {plan.warnings.map((w: string) => <li key={w}>{w}</li>)}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 mt-2">
                                            <button
                                                onClick={handleConfirm}
                                                disabled={executing}
                                                className={`flex-1 py-2.5 bg-dreyv-green text-black font-bold rounded-lg text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-dreyv-green/20 ${executing ? "opacity-50 cursor-wait" : ""}`}
                                            >
                                                {executing ? "Proposing..." : "Confirm & Execute"}
                                            </button>
                                            <button
                                                onClick={() => setPlan(null)}
                                                disabled={executing}
                                                className="px-4 py-2.5 bg-white/[0.04] text-white font-medium rounded-lg text-sm hover:bg-white/[0.06] transition-all border border-white/[0.08]"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
