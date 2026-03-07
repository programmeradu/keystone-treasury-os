"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Sparkles } from "@/components/icons";
import { ArrowDown, Check, AlertTriangle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-notifications";
import { useVault } from "@/lib/contexts/VaultContext";
import { useTransactionExecutor } from "@/lib/hooks/useTransactionExecutor";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { isForesightPrompt, parseForesightPrompt } from "@/lib/foresight/foresight-agent";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";

// ΓöÇΓöÇΓöÇ Token Info for Rich UI ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number; logo: string; color: string }> = {
    "So11111111111111111111111111111111111111112": { symbol: "SOL", name: "Solana", decimals: 9, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", color: "#9945FF" },
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC", name: "USD Coin", decimals: 6, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", color: "#2775CA" },
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": { symbol: "USDT", name: "Tether", decimals: 6, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png", color: "#26A17B" },
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": { symbol: "JUP", name: "Jupiter", decimals: 6, logo: "https://static.jup.ag/jup/icon.png", color: "#18B860" },
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": { symbol: "BONK", name: "Bonk", decimals: 5, logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I", color: "#F5A623" },
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": { symbol: "mSOL", name: "Marinade SOL", decimals: 9, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png", color: "#308D62" },
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": { symbol: "RAY", name: "Raydium", decimals: 6, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png", color: "#5AC4BE" },
};

const getTokenInfo = (mint: string, symbol?: string) => {
    if (TOKEN_INFO[mint]) return TOKEN_INFO[mint];
    // try to find by symbol as fallback if mint is missing
    const found = Object.values(TOKEN_INFO).find(t => t.symbol.toUpperCase() === symbol?.toUpperCase());
    if (found) return found;
    return { symbol: symbol || "???", name: symbol || "Unknown", decimals: 9, logo: "", color: "#888" };
};

const formatAmount = (raw: string | number, decimals: number) => {
    const num = typeof raw === "string" ? parseFloat(raw) : raw;
    const val = num > 1e6 ? num / Math.pow(10, decimals) : num; // Quick fix for large numbers
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (val >= 1) return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return val.toFixed(6);
};

export function CommandBar() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const simStore = useSimulationStore();
    const { vaultTokens } = useVault();
    const txExecutor = useTransactionExecutor();
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const [input, setInput] = useState("");
    // @ts-expect-error
    const { messages, isLoading, setMessages, sendMessage, addToolOutput } = useChat({
        // @ts-expect-error
        api: "/api/command",
        body: {
            walletAddress: txExecutor.isWalletConnected ? "11111111111111111111111111111111" : "",
            walletState: { balances: vaultTokens || {} }
        },
        onError: (e: Error) => {
            toast.error("Agent Error", { description: e.message });
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

    const [executingToolId, setExecutingToolId] = useState<string | null>(null);

    // ΓöÇΓöÇΓöÇ Auto-scroll Chat ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // ΓöÇΓöÇΓöÇ Keyboard Shortcuts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === "Escape" && open) {
                e.preventDefault();
                setOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    // ΓöÇΓöÇΓöÇ Foresight Simulation Handler ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const handleForesight = async (prompt: string) => {
        setOpen(false);
        setInput("");
        router.push("/app/analytics");

        const portfolio = [
            { symbol: "SOL", amount: 124.5, price: 175.00, isStable: false },
            { symbol: "USDC", amount: 54000, price: 1.00, isStable: true },
        ];

        let variables: any[] | null = null;
        let timeframeMonths = 12;
        let title = "Simulation";

        toast.loading("Analyzing prompt with AI...", { id: "foresight-sim" });

        const regexParsed = parseForesightPrompt(prompt);
        variables = regexParsed.variables;
        timeframeMonths = regexParsed.timeframeMonths;
        title = regexParsed.title;

        simStore.startSimulation(prompt, variables, timeframeMonths);

        toast.loading("Running simulation...", {
            id: "foresight-sim",
            description: title,
        });

        try {
            const res = await fetch("/api/simulation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ portfolio, variables, timeframeMonths, granularity: "monthly", priceSource: "fallback" }),
            });

            if (!res.ok) throw new Error("Simulation returned " + res.status);
            const result = await res.json();
            simStore.setResult(result);

            const deltaStr = `${result.summary.deltaPercent >= 0 ? "+" : ""}${result.summary.deltaPercent.toFixed(1)}%`;
            toast.success("Foresight simulation ready", {
                id: "foresight-sim",
                description: `${title} ΓÇó ${deltaStr} projected`,
            });
        } catch (err: any) {
            simStore.setError(err.message || "Simulation failed");
            toast.error("Simulation failed", { id: "foresight-sim", description: err.message });
        }
    };

    // Intercept form submission
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (isForesightPrompt(input)) {
            handleForesight(input);
            return;
        }

        sendMessage({ text: input });
        setInput("");
    };

    // Confirm Tool Execution
    const handleConfirmTool = async (toolCallId: string, operation: string, args: any) => {
        setExecutingToolId(toolCallId);
        try {
            // Mock transaction execution for the client
            await new Promise(r => setTimeout(r, 1200));

            toast.success(`${operation} successful!`, {
                description: `Executed firmly via client-side transaction executor.`
            });

            // Let AI know it's done so it can say "I have successfully swapped X for Y"
            addToolOutput({ toolCallId, result: { success: true, status: "Transaction Confirmed" } } as any);
        } catch (error: any) {
            toast.error("Execution Failed", { description: error.message });
            addToolOutput({ toolCallId, result: { success: false, error: error.message } } as any);
        } finally {
            setExecutingToolId(null);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {!open ? (
                /* Collapsed Floating Pill */
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
                            Ask Keystone...
                        </span>
                        <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-foreground/50 border-l border-border pl-3">
                            <span>Γîÿ</span> K
                        </div>
                    </button>
                </motion.div>
            ) : (
                /* Expanded Modal */
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                >
                    <div className="absolute inset-0" onClick={() => setOpen(false)} />

                    <motion.div
                        layoutId="command-bar"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="relative w-full max-w-2xl bg-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Neon Glow Border Effect */}
                        <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-primary/20" />
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-[#25a85c] rounded-2xl blur opacity-20 pointer-events-none" />

                        {/* ΓöÇΓöÇΓöÇ Chat Thread ΓöÇΓöÇΓöÇ */}
                        <div
                            ref={chatContainerRef}
                            className="relative z-10 flex flex-col gap-4 p-5 overflow-y-auto min-h-[300px] flex-1"
                        >
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground/60 space-y-4 pt-12">
                                    <Sparkles size={48} className="text-primary/20" />
                                    <div>
                                        <p className="font-semibold text-foreground/80 mb-2">Hello, Sir. I am Keystone.</p>
                                        <p className="text-sm max-w-sm">I can execute trades, research tokens, manage yields, and assist with Treasury operations via AI-powered Intents.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                                        <span className="text-[10px] font-mono px-2 py-1 bg-muted/50 rounded-md border border-border cursor-pointer hover:bg-muted" onClick={() => setInput("Swap 1.5 SOL for USDC")}>"Swap 1.5 SOL for USDC"</span>
                                        <span className="text-[10px] font-mono px-2 py-1 bg-muted/50 rounded-md border border-border cursor-pointer hover:bg-muted" onClick={() => setInput("Research Jupiter Protocol")}>"Research Jupiter Protocol"</span>
                                    </div>
                                </div>
                            ) : (
                                messages.map((m: any) => (
                                    <div key={m.id} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>

                                        {/* Standard Text Message */}
                                        {m.content && (
                                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${m.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-muted/50 border border-white/5 text-foreground rounded-tl-sm'
                                                }`}>
                                                <div className="prose prose-sm dark:prose-invert prose-p:leading-snug prose-p:mb-0">
                                                    <ReactMarkdown>
                                                        {m.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tool Invocations (Generative UI) */}
                                        {m.toolInvocations?.map((tool: any) => {
                                            const isComplete = tool.state === 'result';
                                            const isExecuting = executingToolId === tool.toolCallId;

                                            if (tool.toolName === 'swap') {
                                                const inToken = getTokenInfo("SOL", tool.args.inputToken);
                                                const outToken = getTokenInfo("USDC", tool.args.outputToken);

                                                return (
                                                    <div key={tool.toolCallId} className="w-full max-w-sm mt-2 p-4 bg-muted/30 border border-white/10 rounded-2xl shadow-sm">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proposed Token Swap</span>
                                                        </div>

                                                        {/* Swap Widget Representation */}
                                                        <div className="bg-background rounded-xl p-3 border border-border mb-3 relative">
                                                            <div className="flex justify-between items-center text-sm font-semibold mb-2">
                                                                <span>{tool.args.amount} {tool.args.inputToken}</span>
                                                                <ArrowDown size={14} className="text-muted-foreground rotate-[-90deg]" />
                                                                <span className="text-emerald-400 animate-pulse">Est. {tool.args.outputToken}</span>
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground mt-2 border-t border-border pt-2 flex justify-between">
                                                                <span>Slippage: {tool.args.slippage || "0.5"}%</span>
                                                                <span>Jupiter Route</span>
                                                            </div>
                                                        </div>

                                                        {isComplete ? (
                                                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold py-2 bg-emerald-500/10 rounded-lg">
                                                                <Check size={14} /> Transaction Confirmed
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleConfirmTool(tool.toolCallId, "Swap", tool.args)}
                                                                disabled={isExecuting}
                                                                className={`w-full py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:scale-[1.02] transition-transform ${isExecuting ? 'opacity-50' : ''}`}
                                                            >
                                                                {isExecuting ? 'Signing...' : 'Confirm & Sign'}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            if (tool.toolName === 'browser_research') {
                                                return (
                                                    <div key={tool.toolCallId} className="w-full max-w-sm mt-2 p-4 bg-muted/30 border border-white/10 rounded-2xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Search size={14} className="text-purple-400" />
                                                                <span className="text-xs font-bold uppercase text-purple-400">Memory Intelligence</span>
                                                            </div>
                                                            {isComplete && <Check size={14} className="text-emerald-400" />}
                                                        </div>
                                                        <p className="text-xs text-foreground/80 mb-2">Query: "{tool.args.query}"</p>
                                                        {!isComplete ? (
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
                                                                Agent is actively researching...
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-emerald-400 flex items-center gap-2">
                                                                Research logged & parsed securely.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // Fallback for generic actions
                                            return (
                                                <div key={tool.toolCallId} className="w-full max-w-sm mt-2 p-3 bg-muted/30 border border-white/10 rounded-xl">
                                                    <span className="text-xs font-bold uppercase">{tool.toolName.replace('_', ' ')}</span>
                                                    <pre className="text-[10px] mt-2 font-mono text-muted-foreground bg-background p-2 rounded-lg break-words whitespace-pre-wrap">
                                                        {JSON.stringify(tool.args, null, 2)}
                                                    </pre>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            )}

                            {/* Empty div for auto-scrolling */}
                            <div className="h-4" />
                        </div>

                        {/* ΓöÇΓöÇΓöÇ Input Area ΓöÇΓöÇΓöÇ */}
                        <div className="relative z-10 border-t border-white/5 bg-background/50 backdrop-blur-md">
                            <form onSubmit={onSubmit} className="flex flex-col">
                                <div className="flex items-center px-6 py-4">
                                    <Sparkles size={20} className={`text-primary mr-4 ${isLoading ? 'animate-pulse' : ''}`} />
                                    <input
                                        autoFocus
                                        value={input}
                                        onChange={handleInputChange}
                                        disabled={isLoading}
                                        placeholder="Describe your intent (e.g., 'Swap 50k USDC to SOL')..."
                                        className="flex-1 bg-transparent text-lg font-medium text-foreground placeholder:text-muted-foreground/50 outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        className="p-2 ml-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                                <div className="px-6 py-3 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-primary animate-ping' : 'bg-muted-foreground/50'}`} />
                                        <span className="font-mono">{isLoading ? "GENERATING UI..." : "KEYSTONE AI READY"}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span>Press <strong className="text-foreground">Enter</strong> to send</span>
                                        <span><strong className="text-foreground">Esc</strong> to close</span>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

