"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";
import { executeAction } from "@/lib/actions";
import { SquadsClient } from "@/lib/squads";
import { Connection } from "@solana/web3.js";
import { IntentRegistry } from "@/lib/agents/registry";

// ... existing imports ...

export function CommandBar() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [plan, setPlan] = useState<any>(null);

    // ... existing useEffect ...

    const executeCommand = async () => {
        if (!input.trim() || loading) return;
        setLoading(true);
        try {
            const res = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: input })
            });
            const data = await res.json();

            if (data.plan && data.plan.actions) {
                const actions = data.plan.actions;
                const safeOperations = ["navigate", "refresh", "ui_query", "governance_list", "external_balance", "monitor"];

                // Check if ALL actions are safe
                const allSafe = actions.every((a: any) => safeOperations.includes(a.operation.toLowerCase()));

                if (allSafe && actions.length > 0) {
                    const connection = new Connection("https://api.mainnet-beta.solana.com");
                    const mockWallet = {
                        publicKey: { toString: () => "AdminHash...123" },
                        signTransaction: async (tx: any) => tx,
                        signAllTransactions: async (txs: any[]) => txs
                    };
                    const squadsClient = new SquadsClient(connection, mockWallet);

                    await executeAction(data.plan, {
                        connection,
                        wallet: mockWallet,
                        squadsClient,
                        vaultAddress: "11111111111111111111111111111111"
                    });

                    // Feedback if it contains a UI Query
                    const queryAction = actions.find((a: any) => a.operation === "ui_query");
                    if (queryAction) {
                        alert(`Keystone Intelligence:\n${data.plan.estimatedOutcome}`);
                    }

                    setInput("");
                    setOpen(false);
                    return;
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
            // Setup Connection & Client (In real app, use useConnection / useWallet hooks)
            const connection = new Connection("https://api.mainnet-beta.solana.com");

            // MOCK WALLET ADAPTER (Simulating a connected wallet)
            const mockWallet = {
                publicKey: { toString: () => "AdminHash...123" },
                signTransaction: async (tx: any) => tx,
                signAllTransactions: async (txs: any[]) => txs
            };

            const squadsClient = new SquadsClient(connection, mockWallet);

            // Execute Action
            // Using a demo Vault Address (Valid Base58)
            const vaultAddress = "11111111111111111111111111111111";

            const signature = await executeAction(plan, {
                connection,
                wallet: mockWallet,
                squadsClient,
                vaultAddress
            });

            alert(`✅ Action Proposed!\nSignature: ${signature}\n\nNotify your team to approve.`);

            setOpen(false);
            setPlan(null);
            setInput("");

        } catch (error) {
            console.error("Execution Failed:", error);
            alert("❌ Execution Failed. Check console.");
        } finally {
            setExecuting(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!open ? (
                /* 1. Collapsed Floating Pill (Bottom) */
                <motion.div
                    key="trigger"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                >
                    <button
                        onClick={() => setOpen(true)}
                        className="flex items-center gap-3 pl-4 pr-3 py-3 rounded-full bg-background/80 backdrop-blur-xl border border-border shadow-2xl hover:border-primary/50 hover:shadow-[0_0_20px_var(--dashboard-accent-muted)] transition-all group"
                    >
                        <Sparkles size={16} className="text-primary" />
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mr-2">
                            Ask Keystone... {IntentRegistry.getActive().length > 0 && <span className="inline-block w-1 h-1 rounded-full bg-primary animate-ping ml-1" title="Agents Active" />}
                        </span>
                        <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-foreground/50 border-l border-border pl-3">
                            <span>⌘</span> K
                        </div>
                    </button>
                </motion.div>
            ) : (
                /* 2. Expanded Modal (Center) */
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                >
                    {/* Click outside to close */}
                    <div className="absolute inset-0" onClick={() => setOpen(false)} />

                    <motion.div
                        layoutId="command-bar"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Neon Glow Border Effect */}
                        <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-primary/20" />
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-[#25a85c] rounded-2xl blur opacity-20" />

                        <div className="relative z-10 flex flex-col">
                            {!plan ? (
                                /* INPUT STATE */
                                <>
                                    <div className="flex items-center px-6 py-5 border-b border-border">
                                        <Sparkles size={20} className={`text-primary mr-4 ${loading ? 'animate-spin' : ''}`} />
                                        <input
                                            autoFocus
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && executeCommand()}
                                            disabled={loading}
                                            placeholder="Describe your intent (e.g., 'Swap 50k USDC to SOL')..."
                                            className="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/50 outline-none"
                                        />
                                    </div>

                                    <div className="px-6 py-3 bg-muted/50 flex items-center justify-between text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full bg-primary ${loading ? 'animate-ping' : 'animate-pulse'}`} />
                                            <span className="font-mono">{loading ? "THINKING..." : "AI AGENT LISTENING"}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span>Press <strong className="text-foreground">Enter</strong> to execute</span>
                                            <span><strong className="text-foreground">Esc</strong> to close</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* PLAN REVIEW STATE */
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                                                <Sparkles size={16} className="text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Proposed {plan.actions?.length > 1 ? "Workflow" : "Action"}</h3>
                                                <p className="text-xs text-muted-foreground">{plan.actions?.length || 1} step{plan.actions?.length > 1 ? 's' : ''} prepared</p>
                                            </div>
                                        </div>
                                        <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono uppercase">
                                            {plan.operation}
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-4 scrollbar-hide">
                                        {plan.actions?.map((action: any, idx: number) => (
                                            <div key={idx} className="bg-muted rounded-xl p-4 border border-border">
                                                <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Step {idx + 1}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-background/50 text-[9px] font-mono text-muted-foreground uppercase">{action.operation}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                    {Object.entries(action.parameters || {}).map(([key, value]) => (
                                                        <div key={key}>
                                                            <span className="text-[9px] text-muted-foreground uppercase block">{key}</span>
                                                            <span className="text-xs text-foreground font-mono truncate block">{String(value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="bg-muted rounded-xl p-4 border border-border border-l-2 border-l-primary">
                                            <span className="text-[10px] text-primary uppercase font-bold block mb-1">Agent Strategy</span>
                                            <p className="text-sm text-foreground italic leading-relaxed">{plan.estimatedOutcome}</p>
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
                                            className={`flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 ${executing ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {executing ? "Proposing..." : "Confirm & Execute"}
                                        </button>
                                        <button
                                            onClick={() => setPlan(null)}
                                            disabled={executing}
                                            className="px-4 py-2.5 bg-muted text-foreground font-medium rounded-lg text-sm hover:bg-muted/80 transition-all border border-border"
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
    );
}
