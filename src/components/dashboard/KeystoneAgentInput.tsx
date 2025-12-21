"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Cpu } from "lucide-react";
import { AppEventBus } from "@/lib/events";
import { motion, AnimatePresence } from "framer-motion";

export function KeystoneAgentInput() {
    const [inputValue, setInputValue] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isProcessing) return;

        const command = inputValue.trim();
        setInputValue("");
        setIsProcessing(true);

        // 1. Log to Command Center that we received input
        AppEventBus.emit("AGENT_COMMAND", { command, source: "User Terminal" });

        try {
            // 2. Think (Call LLM)
            AppEventBus.emit("AGENT_LOG", { message: "🤔 Agent thinking...", level: "INFO" });

            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: command,
                    walletState: { balances: {}, portfolio: {}, totalValue: 0 }
                })
            });

            if (!response.ok) throw new Error("Agent Brain Unreachable");

            const data = await response.json();
            const plan = data.plan;

            // 3. Log AI Reasoning & Steps via Generator Function
            const executeLogs = async () => {
                // Prioritize Direct Answer (Conversational) over Reasoning (Internal)
                if (plan.direct_answer) {
                    AppEventBus.emit("AGENT_LOG", { message: `${plan.direct_answer}`, level: "SUCCESS" });
                    await new Promise(r => setTimeout(r, 800));
                } else if (plan.reasoning) {
                    AppEventBus.emit("AGENT_LOG", { message: `💡 ${plan.reasoning}`, level: "INFO" });
                    await new Promise(r => setTimeout(r, 800));
                }

                if (plan.logs && plan.logs.length > 0) {
                    for (const log of plan.logs) {
                        AppEventBus.emit("AGENT_LOG", { message: `> ${log}`, level: "SYSTEM" });
                        // Random "thinking" delay between 300ms and 800ms
                        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
                    }
                }
            };

            await executeLogs();

            // 4. Execution Logic (Tool Call)
            if (plan.actions && plan.actions.length > 0) {
                for (const action of plan.actions) {
                    // Universal Tool Router - No Hardcoded Logs!
                    switch (action.operation) {
                        case "yield_deposit":
                        case "yield_withdraw":
                            AppEventBus.emit("SHOW_STRATEGY_MODAL", action.parameters);
                            break;
                        case "swap":
                            // Currently we just log acceptance as Swap UI is not yet event-driven
                            // Ideally: AppEventBus.emit("OPEN_SWAP_MODAL", action.parameters);
                            AppEventBus.emit("AGENT_LOG", { message: `🛠️ Preparing Swap UI [${action.parameters.inputToken} -> ${action.parameters.outputToken}]`, level: "INFO" });
                            break;
                        default:
                            AppEventBus.emit("AGENT_LOG", { message: `Executing tool: ${action.operation}...`, level: "INFO" });
                    }
                }
            } else {
                AppEventBus.emit("AGENT_LOG", { message: "Analysis complete. No further actions required.", level: "INFO" });
            }

        } catch (error: any) {
            console.error("Agent Input Error:", error);
            AppEventBus.emit("AGENT_LOG", { message: `Error: ${error.message}`, level: "ERROR" });
        } finally {
            setIsProcessing(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative"
            >
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl opacity-20 animate-pulse" />

                <form
                    onSubmit={handleSubmit}
                    className="relative bg-background/80 backdrop-blur-xl border border-primary/20 rounded-full overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)] flex items-center p-1.5 ring-1 ring-white/5 focus-within:ring-primary/50 transition-all"
                >
                    <div className="pl-4 pr-3 text-primary">
                        {isProcessing ? (
                            <Cpu className="animate-spin" size={20} />
                        ) : (
                            <Sparkles className="animate-pulse" size={20} />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isProcessing ? "Agent is processing..." : "Ask Keystone Agent (e.g. 'Optimize Yield')..."}
                        disabled={isProcessing}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium h-10 placeholder:text-muted-foreground/50 text-foreground"
                    />

                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isProcessing}
                        className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </form>

                {/* Status Badge */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#36e27b]" />
                    <span className="text-[10px] font-mono font-bold text-primary/80 uppercase tracking-widest">Keystone Engine Online</span>
                </div>
            </motion.div>
        </div>
    );
}
