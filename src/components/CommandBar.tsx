"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles } from "@/components/icons";
import { ArrowDown, Check, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { executeAction } from "@/lib/actions";
import { SquadsClient } from "@/lib/squads";
import { Connection } from "@solana/web3.js";
import { IntentRegistry } from "@/lib/agents/registry";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-notifications";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { isForesightPrompt, parseForesightPrompt } from "@/lib/foresight/foresight-agent";
import { useVault } from "@/lib/contexts/VaultContext";
import { useTransactionExecutor, type StepStatus } from "@/lib/hooks/useTransactionExecutor";

export function CommandBar() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [plan, setPlan] = useState<any>(null);
    const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
    const router = useRouter();
    const simStore = useSimulationStore();
    const { vaultTokens } = useVault();
    const txExecutor = useTransactionExecutor();

    // ─── Token Info for Rich UI ────────────────────────────────────
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
        return { symbol: symbol || "???", name: symbol || "Unknown", decimals: 9, logo: "", color: "#888" };
    };

    const formatAmount = (raw: string | number, decimals: number) => {
        const num = typeof raw === "string" ? parseFloat(raw) : raw;
        const val = num / Math.pow(10, decimals);
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
        if (val >= 1_000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (val >= 1) return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
        return val.toFixed(6);
    };

    // ─── Keyboard Shortcuts ────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ⌘K / Ctrl+K to toggle command bar
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            // Escape to close
            if (e.key === "Escape" && open) {
                e.preventDefault();
                setOpen(false);
                setPlan(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    // ─── Foresight Simulation Handler ─────────────────────────────
    const handleForesight = async (prompt: string) => {
        // Immediately close bar and navigate so user sees analytics loading
        setOpen(false);
        setInput("");
        router.push("/app/analytics");

        // ─── Build portfolio from real vault data + live prices ────
        const STABLECOINS = new Set(["USDC","USDT","BUSD","DAI","TUSD","USDP","FRAX","LUSD","PYUSD","GUSD"]);
        const hasVault = vaultTokens && vaultTokens.length > 0;
        let priceSource: "live" | "vault" | "fallback" = hasVault ? "vault" : "fallback";

        let portfolio: { symbol: string; amount: number; price: number; change24h?: number; isStable?: boolean; mint?: string }[];

        if (hasVault) {
            portfolio = vaultTokens.map((t: any) => ({
                symbol: t.symbol || "SPL",
                amount: t.amount || 0,
                price: t.price || 0,
                change24h: t.change24h || 0,
                isStable: STABLECOINS.has((t.symbol || "").toUpperCase()),
                mint: t.mint || undefined,
            }));

            // Attempt live price overlay
            try {
                const symbols = portfolio.map(t => t.symbol).filter(Boolean).join(",");
                if (symbols) {
                    const priceRes = await fetch(`/api/jupiter/price?ids=${encodeURIComponent(symbols)}`);
                    if (priceRes.ok) {
                        const priceJson = await priceRes.json();
                        const priceData = priceJson.data || {};
                        for (const token of portfolio) {
                            const live = priceData[token.symbol];
                            if (live?.price && live.price > 0) {
                                token.price = live.price;
                            }
                        }
                        priceSource = "live";
                    }
                }
            } catch (e) {
                console.warn("[Foresight] Live price fetch failed, using vault prices", e);
            }
        } else {
            toast.warning("No vault connected", {
                id: "foresight-no-vault",
                description: "Connect a vault for accurate Foresight simulations. Using demo portfolio.",
            });
            portfolio = [
                { symbol: "SOL", amount: 124.5, price: 175.00, isStable: false },
                { symbol: "USDC", amount: 54000, price: 1.00, isStable: true },
                { symbol: "JUP", amount: 850, price: 1.12, isStable: false },
                { symbol: "BONK", amount: 15000000, price: 0.000024, isStable: false },
            ];
        }

        // ─── Step 1: Try LLM-powered parsing (Groq — fast) ─────────
        let variables: any[] | null = null;
        let timeframeMonths = 12;
        let title = "Simulation";
        let confidence = 0;
        let parsedSummary: string[] = [];
        let parserUsed: "llm" | "regex" = "regex";

        toast.loading("Analyzing prompt with AI...", { id: "foresight-sim" });

        try {
            const llmRes = await fetch("/api/foresight/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    portfolio: portfolio.map(t => ({ symbol: t.symbol, amount: t.amount, price: t.price })),
                }),
            });

            if (llmRes.ok) {
                const llmData = await llmRes.json();
                if (llmData.variables && llmData.variables.length > 0) {
                    variables = llmData.variables;
                    timeframeMonths = llmData.timeframeMonths || 12;
                    title = llmData.title || "AI-Parsed Scenario";
                    confidence = llmData.confidence || 0.85;
                    parsedSummary = llmData.parsedSummary || [];
                    parserUsed = "llm";
                    console.log(`[Foresight] LLM parsed (${llmData.provider}):`, title, variables);
                }
            }
        } catch (e) {
            console.warn("[Foresight] LLM parse failed, falling back to regex:", e);
        }

        // ─── Step 2: Fallback to regex parsing ──────────────────────
        if (!variables || variables.length === 0) {
            const regexParsed = parseForesightPrompt(prompt);
            variables = regexParsed.variables;
            timeframeMonths = regexParsed.timeframeMonths;
            title = regexParsed.title;
            confidence = regexParsed.confidence;
            parsedSummary = regexParsed.parsedSummary;
            parserUsed = "regex";
            console.log("[Foresight] Using regex parser:", title, variables);
        }

        // Start simulation in store
        simStore.startSimulation(prompt, variables, timeframeMonths);

        toast.loading("Running simulation...", {
            id: "foresight-sim",
            description: `${parserUsed === "llm" ? " " : ""}${title}`,
        });

        // Warn user if confidence is low
        if (confidence < 0.3) {
            toast.warning("Low parsing confidence", {
                id: "foresight-low-conf",
                description: "Prompt wasn't fully understood — using default stress test scenario.",
            });
        }

        try {
            const res = await fetch("/api/simulation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    portfolio,
                    variables,
                    timeframeMonths,
                    granularity: "monthly",
                    priceSource,
                }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Simulation returned ${res.status}`);
            }

            const result = await res.json();
            simStore.setResult(result);

            const deltaStr = `${result.summary.deltaPercent >= 0 ? "+" : ""}${result.summary.deltaPercent.toFixed(1)}%`;
            toast.success("Foresight simulation ready", {
                id: "foresight-sim",
                description: `${parserUsed === "llm" ? " " : ""}${title} • ${deltaStr} projected`,
            });
        } catch (err: any) {
            simStore.setError(err.message || "Simulation failed");
            toast.error("Simulation failed", { id: "foresight-sim", description: err.message });
        }
    };

    const executeCommand = async () => {
        if (!input.trim() || loading) return;

        // Check if this is a foresight/simulation prompt first
        if (isForesightPrompt(input)) {
            await handleForesight(input);
            return;
        }

        setLoading(true);
        try {
            // ─── Diamond Merge: LLM Planning + Real Agent Execution ─────
            const res = await fetch("/api/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: input })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || data.details || `Agent returned ${res.status}`);
            }

            // Handle direct answers (no actionable plan)
            if (data.mode === "answer" && data.plan?.direct_answer) {
                toast.success("Keystone", { description: data.plan.direct_answer });
                setInput("");
                setOpen(false);
                return;
            }

            // ─── Coordinator Mode: Real agents executed server-side ─────
            if (data.mode === "coordinator" && data.execution) {
                const exec = data.execution;
                if (exec.success || exec.status === "APPROVAL_REQUIRED") {
                    // Show the real execution result with plan for confirmation
                    setPlan({
                        ...data.plan,
                        _execution: exec,
                        _mode: "coordinator",
                    });
                } else {
                    // Coordinator failed but plan exists — show plan with warnings
                    const errMsg = exec.errors?.map((e: any) => e.message).join("; ") || "Agent execution failed";
                    toast.error("Agent Execution Issue", { description: errMsg });
                    setPlan(data.plan);
                }
                return;
            }

            // ─── Client Mode: Safe operations handled locally ───────────
            if (data.mode === "client" && data.plan?.actions) {
                const actions = data.plan.actions;
                const safeOperations = ["navigate", "refresh", "ui_query", "governance_list", "external_balance", "monitor"];
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

                    const queryAction = actions.find((a: any) => a.operation === "ui_query");
                    if (queryAction) {
                        toast.info("Keystone Intelligence", { description: data.plan.estimatedOutcome });
                    }

                    setInput("");
                    setOpen(false);
                    return;
                }

                // Non-safe client operations need confirmation
                setPlan(data.plan);
                return;
            }

            // Fallback: show plan for confirmation
            if (data.plan) {
                setPlan(data.plan);
            }
        } catch (error: any) {
            console.error("[CommandBar] Agent error:", error);
            const msg = error?.message || "Unknown error";
            if (msg.includes("not configured") || msg.includes("GROQ_API_KEY")) {
                toast.error("LLM API key missing", {
                    description: "Set GROQ_API_KEY in your .env.local file.",
                });
            } else {
                toast.error("Command failed", { description: msg });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!plan) return;

        const actions = plan.actions || [];
        const txOps = new Set(["swap", "transfer", "stake", "bridge", "yield_deposit", "yield_withdraw", "rebalance"]);
        const hasTxOps = actions.some((a: any) => txOps.has(a.operation?.toLowerCase()));

        // Check wallet for tx-producing operations
        if (hasTxOps && !txExecutor.isWalletConnected && !txExecutor.isMultisig) {
            toast.error("Wallet Not Connected", {
                description: "Connect a wallet to sign transactions.",
            });
            return;
        }

        setExecuting(true);
        // Initialize step statuses
        setStepStatuses(actions.map(() => "pending" as StepStatus));

        try {
            // Non-tx-only plans (navigate, refresh, etc.) — use legacy path
            if (!hasTxOps) {
                const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
                const connection = new Connection(rpcUrl);
                const mockWallet = {
                    publicKey: { toString: () => "11111111111111111111111111111111" },
                    signTransaction: async (tx: any) => tx,
                    signAllTransactions: async (txs: any[]) => txs
                };
                const squadsClient = new SquadsClient(connection, mockWallet);
                await executeAction(plan, {
                    connection, wallet: mockWallet, squadsClient,
                    vaultAddress: "11111111111111111111111111111111"
                });
                setOpen(false);
                setPlan(null);
                setInput("");
                return;
            }

            // Execute all actions sequentially via the shared hook
            const results = await txExecutor.executePlan(actions, (idx, status) => {
                setStepStatuses(prev => {
                    const next = [...prev];
                    next[idx] = status;
                    return next;
                });
            });

            const allSuccess = results.every(r => r.success);
            if (allSuccess) {
                toast.success(actions.length > 1 ? "All Steps Completed" : "Action Completed", {
                    description: actions.length > 1
                        ? `${actions.length} steps executed successfully.`
                        : `${actions[0]?.operation} completed.`,
                });
                // Brief delay so user sees the final green checks
                await new Promise(r => setTimeout(r, 1200));
                setOpen(false);
                setPlan(null);
                setInput("");
            } else {
                const failedIdx = results.findIndex(r => !r.success);
                toast.error(`Step ${failedIdx + 1} Failed`, {
                    description: results[failedIdx]?.error || "Check console for details.",
                });
            }
        } catch (error: any) {
            console.error("Execution Failed:", error);
            toast.error("Execution Failed", {
                description: error.message || "Check console for details.",
            });
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
                            ) : (() => {
                                const swapResult = plan._execution?.result?.swap_result;
                                const simulation = plan._execution?.result?.simulation;
                                const isCoordinatorSwap = plan._mode === "coordinator" && swapResult;

                                // Token info for rich display
                                const inToken = isCoordinatorSwap ? getTokenInfo(swapResult.inputMint, plan.actions?.[0]?.parameters?.inputToken) : null;
                                const outToken = isCoordinatorSwap ? getTokenInfo(swapResult.outputMint, plan.actions?.[0]?.parameters?.outputToken) : null;
                                const inAmountFormatted = isCoordinatorSwap ? formatAmount(swapResult.inAmount, inToken!.decimals) : null;
                                const outAmountFormatted = isCoordinatorSwap ? formatAmount(swapResult.outAmount, outToken!.decimals) : null;
                                const priceImpact = isCoordinatorSwap ? parseFloat(swapResult.priceImpact || "0") : 0;
                                const riskLevel = swapResult?.riskLevel || "low";
                                const firewallChecks = swapResult?.firewallChecks || {};
                                const routePool = swapResult?.instructions?.[0]?.pool || "Jupiter";

                                return isCoordinatorSwap ? (
                                /* ═══ RICH COORDINATOR SWAP UI ═══ */
                                <div className="p-5">
                                    {/* Header: Simulation Status */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${swapResult.simulationPassed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'} flex items-center justify-center`}>
                                                <div className={`w-3 h-3 rounded-full ${swapResult.simulationPassed ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">
                                                    {swapResult.simulationPassed ? "Simulation Passed" : "Simulation Failed"}
                                                </h3>
                                                <p className="text-[11px] text-muted-foreground">Pre-flight verified by Simulation Firewall</p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            riskLevel === "low" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                            riskLevel === "medium" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                            "bg-red-500/10 text-red-400 border border-red-500/20"
                                        }`}>
                                            {riskLevel} risk
                                        </div>
                                    </div>

                                    {/* ── Swap Visualization ── */}
                                    <div className="bg-muted/50 rounded-2xl border border-border overflow-hidden mb-4">
                                        {/* Input Token */}
                                        <div className="p-4 flex items-center gap-4">
                                            <div className="relative">
                                                {inToken?.logo ? (
                                                    <img src={inToken.logo} alt={inToken.symbol} className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">{inToken?.symbol?.[0]}</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">You Send</div>
                                                <div className="text-xl font-bold text-foreground">{inAmountFormatted} <span className="text-muted-foreground">{inToken?.symbol}</span></div>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono">{inToken?.name}</div>
                                        </div>

                                        {/* Arrow Divider */}
                                        <div className="relative h-0 flex items-center justify-center">
                                            <div className="absolute inset-x-4 border-t border-border" />
                                            <div className="relative z-10 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
                                                <ArrowDown size={14} className="text-primary" />
                                            </div>
                                        </div>

                                        {/* Output Token */}
                                        <div className="p-4 flex items-center gap-4">
                                            <div className="relative">
                                                {outToken?.logo ? (
                                                    <img src={outToken.logo} alt={outToken.symbol} className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">{outToken?.symbol?.[0]}</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[10px] text-emerald-400 uppercase tracking-wider">You Receive</div>
                                                <div className="text-xl font-bold text-emerald-400">~{outAmountFormatted} <span className="text-emerald-400/60">{outToken?.symbol}</span></div>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono">{outToken?.name}</div>
                                        </div>
                                    </div>

                                    {/* ── Route & Details ── */}
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-muted/50 rounded-xl p-3 border border-border">
                                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Price Impact</div>
                                            <div className={`text-sm font-bold ${priceImpact < 0.5 ? 'text-emerald-400' : priceImpact < 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {priceImpact < 0.01 ? "<0.01" : priceImpact.toFixed(2)}%
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 rounded-xl p-3 border border-border">
                                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Route</div>
                                            <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                                <img src="https://static.jup.ag/jup/icon.png" alt="Jupiter" className="w-3.5 h-3.5 rounded-full" />
                                                {routePool}
                                            </div>
                                        </div>
                                        <div className="bg-muted/50 rounded-xl p-3 border border-border">
                                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Duration</div>
                                            <div className="text-sm font-bold text-foreground">
                                                {plan._execution?.duration ? `${(plan._execution.duration / 1000).toFixed(1)}s` : "< 1s"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Simulation Firewall Checks ── */}
                                    {Object.keys(firewallChecks).length > 0 && (
                                        <div className="bg-muted/30 rounded-xl border border-border p-3 mb-4">
                                            <div className="flex items-center gap-2 mb-2.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Simulation Firewall</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                                {Object.entries(firewallChecks).map(([key, status]) => (
                                                    <div key={key} className="flex items-center gap-2">
                                                        {status === "pass" ? (
                                                            <Check size={12} className="text-emerald-400 shrink-0" />
                                                        ) : status === "warn" ? (
                                                            <AlertTriangle size={12} className="text-yellow-400 shrink-0" />
                                                        ) : (
                                                            <AlertTriangle size={12} className="text-red-400 shrink-0" />
                                                        )}
                                                        <span className="text-[11px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {plan.warnings && plan.warnings.length > 0 && (
                                        <div className="mb-4 bg-orange-500/5 border border-orange-500/15 rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <AlertTriangle size={12} className="text-orange-400" />
                                                <span className="text-[10px] font-bold text-orange-400 uppercase">Warnings</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {plan.warnings.map((w: string, i: number) => (
                                                    <li key={i} className="text-[11px] text-orange-400/80 leading-relaxed">{w}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Buttons */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleConfirm}
                                            disabled={executing}
                                            className={`flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 ${executing ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {executing ? (
                                                <>Signing...</>
                                            ) : (
                                                <>Confirm & Sign</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setPlan(null)}
                                            disabled={executing}
                                            className="px-5 py-3 bg-muted text-foreground font-medium rounded-xl text-sm hover:bg-muted/80 transition-all border border-border"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    {/* Infrastructure Footer */}
                                    <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                            <img src="https://static.jup.ag/jup/icon.png" alt="Jupiter" className="w-3 h-3 rounded-full opacity-50" />
                                            Jupiter
                                        </div>
                                        <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/20" />
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                            <img src="https://avatars.githubusercontent.com/u/116006435?s=20" alt="Helius" className="w-3 h-3 rounded-full opacity-50" />
                                            Helius RPC
                                        </div>
                                        <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/20" />
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                            <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="Solana" className="w-3 h-3 rounded-full opacity-50" />
                                            Solana
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                /* ═══ MULTI-STEP TIMELINE UI ═══ */
                                <div className="p-5">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl ${executing ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-primary/10 border border-primary/20'} flex items-center justify-center`}>
                                                <Sparkles size={16} className={executing ? "text-blue-400 animate-spin" : "text-primary"} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground">
                                                    {executing ? "Executing..." : plan.isChain ? "Multi-Step Workflow" : "Proposed Action"}
                                                </h3>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {plan.actions?.length || 1} step{(plan.actions?.length || 1) > 1 ? 's' : ''} — {txExecutor.isMultisig ? "Squads Proposal" : "Wallet Signing"}
                                                </p>
                                            </div>
                                        </div>
                                        {plan.confidence && (
                                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                plan.confidence === "high" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                plan.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                                "bg-red-500/10 text-red-400 border border-red-500/20"
                                            }`}>
                                                {plan.confidence}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Step Timeline ── */}
                                    <div className="relative max-h-[320px] overflow-y-auto pr-1 mb-4 scrollbar-hide">
                                        {plan.actions?.map((action: any, idx: number) => {
                                            const status = stepStatuses[idx] || "pending";
                                            const op = action.operation?.toLowerCase() || "";
                                            const isLast = idx === (plan.actions?.length || 1) - 1;

                                            // Operation label & color
                                            const OP_META: Record<string, { label: string; color: string }> = {
                                                swap: { label: "Swap", color: "text-blue-400" },
                                                transfer: { label: "Transfer", color: "text-purple-400" },
                                                stake: { label: "Stake", color: "text-emerald-400" },
                                                bridge: { label: "Bridge", color: "text-cyan-400" },
                                                yield_deposit: { label: "Deposit", color: "text-green-400" },
                                                yield_withdraw: { label: "Withdraw", color: "text-orange-400" },
                                                rebalance: { label: "Rebalance", color: "text-indigo-400" },
                                                navigate: { label: "Navigate", color: "text-muted-foreground" },
                                                refresh: { label: "Refresh", color: "text-muted-foreground" },
                                            };
                                            const meta = OP_META[op] || { label: op, color: "text-muted-foreground" };

                                            // Status indicator
                                            const statusDot = status === "done"
                                                ? <div className="w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center"><Check size={12} className="text-emerald-400" /></div>
                                                : status === "executing"
                                                ? <div className="w-7 h-7 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" /></div>
                                                : status === "error"
                                                ? <div className="w-7 h-7 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center"><AlertTriangle size={12} className="text-red-400" /></div>
                                                : status === "skipped"
                                                ? <div className="w-7 h-7 rounded-full bg-muted border-2 border-muted-foreground/20 flex items-center justify-center"><span className="text-[10px] text-muted-foreground">—</span></div>
                                                : <div className="w-7 h-7 rounded-full bg-muted border-2 border-border flex items-center justify-center"><span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span></div>;

                                            // Render parameter summary
                                            const paramSummary = (() => {
                                                if (op === "swap") return `${action.parameters?.amount || "?"} ${action.parameters?.inputToken || "?"} → ${action.parameters?.outputToken || "?"}`;
                                                if (op === "transfer") return `${action.parameters?.amount || "?"} ${action.parameters?.token || "SOL"} → ${(action.parameters?.recipient || "?").slice(0, 8)}...`;
                                                if (op === "stake") return `${action.parameters?.amount || "?"} ${action.parameters?.token || "SOL"} via ${action.parameters?.provider || "?"}`;
                                                if (op === "yield_deposit") return `${action.parameters?.amount || "?"} ${action.parameters?.token || "?"} into ${action.parameters?.protocol || "?"}`;
                                                if (op === "navigate") return action.parameters?.path || "";
                                                return Object.entries(action.parameters || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
                                            })();

                                            return (
                                                <div key={idx} className="flex gap-3 relative">
                                                    {/* Timeline line */}
                                                    <div className="flex flex-col items-center">
                                                        {statusDot}
                                                        {!isLast && (
                                                            <div className={`w-0.5 flex-1 min-h-[16px] my-1 rounded-full ${
                                                                status === "done" ? "bg-emerald-400/40" :
                                                                status === "executing" ? "bg-blue-400/40 animate-pulse" :
                                                                "bg-border"
                                                            }`} />
                                                        )}
                                                    </div>

                                                    {/* Step card */}
                                                    <div className={`flex-1 mb-2 rounded-xl border transition-all ${
                                                        status === "executing" ? "bg-blue-500/5 border-blue-500/20 shadow-sm shadow-blue-500/5" :
                                                        status === "done" ? "bg-emerald-500/5 border-emerald-500/15" :
                                                        status === "error" ? "bg-red-500/5 border-red-500/20" :
                                                        status === "skipped" ? "bg-muted/30 border-border opacity-50" :
                                                        "bg-muted/50 border-border"
                                                    } p-3`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                                                            <span className={`text-[9px] font-mono uppercase ${
                                                                status === "done" ? "text-emerald-400" :
                                                                status === "executing" ? "text-blue-400" :
                                                                status === "error" ? "text-red-400" :
                                                                "text-muted-foreground"
                                                            }`}>
                                                                {status === "executing" ? "signing..." : status}
                                                            </span>
                                                        </div>
                                                        <p className="text-[12px] text-foreground/80 font-mono">{paramSummary}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Reasoning / Outcome */}
                                    {plan.estimatedOutcome && !executing && (
                                        <div className="bg-muted/30 rounded-xl border border-border p-3 mb-4">
                                            <span className="text-[9px] text-primary uppercase font-bold block mb-1">Strategy</span>
                                            <p className="text-[12px] text-foreground/70 leading-relaxed">{plan.estimatedOutcome}</p>
                                        </div>
                                    )}

                                    {/* Warnings */}
                                    {plan.warnings && plan.warnings.length > 0 && !executing && (
                                        <div className="mb-4 bg-orange-500/5 border border-orange-500/15 rounded-xl p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <AlertTriangle size={12} className="text-orange-400" />
                                                <span className="text-[10px] font-bold text-orange-400 uppercase">Warnings</span>
                                            </div>
                                            <ul className="space-y-1">
                                                {plan.warnings.map((w: string, i: number) => (
                                                    <li key={i} className="text-[11px] text-orange-400/80 leading-relaxed">{w}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Buttons */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleConfirm}
                                            disabled={executing}
                                            className={`flex-1 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 ${executing ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {executing ? (
                                                <>Executing {stepStatuses.filter(s => s === "done").length}/{plan.actions?.length || 0}...</>
                                            ) : (
                                                <>{plan.actions?.length > 1 ? `Confirm ${plan.actions.length} Steps` : "Confirm & Sign"}</>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setPlan(null); setStepStatuses([]); }}
                                            disabled={executing}
                                            className="px-5 py-3 bg-muted text-foreground font-medium rounded-xl text-sm hover:bg-muted/80 transition-all border border-border"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    {/* Infrastructure Footer */}
                                    <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border">
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                            <img src="https://static.jup.ag/jup/icon.png" alt="Jupiter" className="w-3 h-3 rounded-full opacity-50" />
                                            Jupiter
                                        </div>
                                        <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/20" />
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                            <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="Solana" className="w-3 h-3 rounded-full opacity-50" />
                                            Solana
                                        </div>
                                    </div>
                                </div>
                                );
                            })()}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
