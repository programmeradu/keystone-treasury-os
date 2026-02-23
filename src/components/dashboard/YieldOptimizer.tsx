import React, { useMemo, useState, useRef, useEffect } from "react";
import { AlertTriangle, TrendingUp, Target, X, Zap, Shield, Cpu, Wallet, Check, Users, ArrowRight } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { motion, AnimatePresence } from "framer-motion";
import { AppEventBus, useAppEvent } from "@/lib/events";
import { YieldEngine } from "@/lib/agents/YieldEngine";
import { classifyToken, YIELD_MINTS, type TokenCategory } from "@/lib/yield-registry";
import { toast } from "@/lib/toast-notifications";
import { useTransactionExecutor } from "@/lib/hooks/useTransactionExecutor";

// ─── Types ──────────────────────────────────────────────────────────
interface YieldRate {
    apy: number;
    source: "live" | "estimated";
    protocol: string;
    symbol: string;
}

type RatesMap = Record<string, YieldRate>;

// ─── Helpers ────────────────────────────────────────────────────────
function safeDivide(num: number, den: number): number {
    if (!den || den === 0) return 0;
    return num / den;
}

// ─── Component ──────────────────────────────────────────────────────
export const YieldOptimizer = () => {
    const { activeVault, vaultTokens, vaultValue, loading, isMultisig, sqClient, vaultConfig } = useVault();
    const txExecutor = useTransactionExecutor();
    const [showStrategy, setShowStrategy] = useState(false);
    const [deploying, setDeploying] = useState(false);
    const [strategyStep, setStrategyStep] = useState<"IDLE" | "ANALYZING" | "RESULT">("IDLE");
    const [liveData, setLiveData] = useState<{
        strategyName: string;
        apy: number;
        quote: any;
        description: string;
        source: "live" | "estimated";
    }>({
        strategyName: "Scanning...",
        apy: 0,
        quote: null,
        description: "",
        source: "estimated",
    });

    // Live APY rates fetched from /api/yield/rates
    const [yieldRates, setYieldRates] = useState<RatesMap>({});
    const [ratesLoaded, setRatesLoaded] = useState(false);

    // AbortController for in-flight analysis
    const abortRef = useRef<AbortController | null>(null);

    // ─── Fetch live APY rates on mount ──────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/yield/rates");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!cancelled && data.rates) {
                    setYieldRates(data.rates);
                }
            } catch (err) {
                console.warn("YieldOptimizer: Failed to fetch live rates, using fallbacks", err);
            } finally {
                if (!cancelled) setRatesLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Cleanup abort on unmount
    useEffect(() => {
        return () => { abortRef.current?.abort(); };
    }, []);

    // ─── Real stats with proper token classification ────────────────
    const stats = useMemo(() => {
        if (!vaultValue || vaultValue === 0) {
            return { total: 0, idle: 0, yieldBearing: 0, speculative: 0, apy: 0, efficiency: 0, idlePct: 0, hasLiveRates: false };
        }

        let idleValue = 0;
        let yieldBearingValue = 0;
        let speculativeValue = 0;
        let weightedApySum = 0;
        let anyLive = false;

        for (const token of vaultTokens) {
            const val = token.value || 0;
            if (val === 0) continue;

            const category: TokenCategory = classifyToken(token.mint, token.symbol);

            switch (category) {
                case "IDLE":
                    idleValue += val;
                    // 0% APY — nothing added to weightedApySum
                    break;

                case "YIELD_BEARING": {
                    yieldBearingValue += val;
                    // Look up real APY for this mint; fall back to registry estimate
                    const rate = yieldRates[token.mint];
                    const registryFallback = YIELD_MINTS[token.mint]?.fallbackApy ?? 0;
                    const tokenApy = rate?.apy ?? registryFallback;
                    if (rate?.source === "live") anyLive = true;
                    weightedApySum += val * tokenApy;
                    break;
                }

                case "SPECULATIVE":
                    speculativeValue += val;
                    // 0% guaranteed yield — nothing added
                    break;
            }
        }

        const efficiency = Math.round(safeDivide(yieldBearingValue, vaultValue) * 100);
        const weightedApy = parseFloat(safeDivide(weightedApySum, vaultValue).toFixed(2));

        return {
            total: vaultValue,
            idle: idleValue,
            yieldBearing: yieldBearingValue,
            speculative: speculativeValue,
            apy: weightedApy,
            efficiency,
            idlePct: Math.round(safeDivide(idleValue, vaultValue) * 100),
            hasLiveRates: anyLive,
        };
    }, [vaultTokens, vaultValue, yieldRates]);

    // ─── Strategy modal event listener ──────────────────────────────
    useAppEvent((event) => {
        if (event.type === "SHOW_STRATEGY_MODAL") {
            abortRef.current?.abort();
            setShowStrategy(true);
            setStrategyStep("ANALYZING");

            const controller = new AbortController();
            abortRef.current = controller;

            const solToken = vaultTokens.find(
                t => t.symbol === "SOL" || t.mint === "So11111111111111111111111111111111111111112"
            );
            const solPrice = solToken?.price || 150;
            const idleSolEquivalent = stats.idle > 0 ? stats.idle / solPrice : 1;
            const amountLamports = Math.max(1_000_000, Math.round(idleSolEquivalent * 1e9));

            (async () => {
                try {
                    const decision = await YieldEngine.determineBestStrategy(amountLamports, controller.signal);
                    if (!controller.signal.aborted) {
                        // Use live rate for the recommended strategy if available
                        const recMint = decision.recommendation.mint;
                        const liveRate = yieldRates[recMint];

                        setLiveData({
                            strategyName: decision.recommendation.name,
                            apy: liveRate?.apy ?? decision.recommendation.projectedApy,
                            quote: decision.quote,
                            description: decision.recommendation.description,
                            source: liveRate?.source ?? "estimated",
                        });
                        setStrategyStep("RESULT");
                    }
                } catch (e: any) {
                    if (controller.signal.aborted) return;
                    console.error("Agent failed to analyze strategies", e);
                    setStrategyStep("RESULT");
                }
            })();
        }
    });

    const hasVault = Boolean(activeVault);
    const isUnoptimized = hasVault && stats.efficiency < 85;

    // ─── Empty State ────────────────────────────────────────────────
    if (!hasVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 flex flex-row items-center justify-between relative min-h-[220px] overflow-hidden shadow-lg">
                <div className="flex flex-col gap-3 z-10 py-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Target size={14} className="text-muted-foreground" />
                        <h2 className="text-muted-foreground uppercase tracking-[0.3em] text-[10px] font-black">
                            Yield Optimizer
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            No vault connected
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 max-w-[220px] leading-relaxed">
                        Connect a Solana address to detect idle capital and unlock yield strategies.
                    </p>
                </div>

                {/* Placeholder ring */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <div className="text-center z-10">
                        <span className="text-4xl font-black block tracking-tighter text-muted-foreground/30">
                            —<span className="text-xl ml-0.5 opacity-60">%</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-[0.25em]">
                            Weighted APY
                        </span>
                    </div>
                    <svg
                        className="absolute inset-0 w-full h-full -rotate-90 scale-[1.1]"
                        viewBox="0 0 100 100"
                        role="img"
                        aria-label="Yield efficiency gauge — no vault connected"
                    >
                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--foreground)" strokeOpacity="0.03" strokeWidth="5" strokeDasharray="2, 1" />
                    </svg>
                    <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-foreground/10" />
                    <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-foreground/10" />
                    <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-foreground/10" />
                    <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-foreground/10" />
                    <div className="absolute -bottom-1 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border text-[9px] font-mono font-black text-muted-foreground tracking-widest flex items-center gap-1.5 shadow-lg">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                        EFF: —%
                    </div>
                </div>
            </div>
        );
    }

    // ─── Connected State ────────────────────────────────────────────
    return (
        <>
            <div
                className="rounded-2xl bg-card border border-border p-6 flex flex-row items-center justify-between relative min-h-[220px] group overflow-hidden shadow-lg"
                role="region"
                aria-label="Yield Optimizer"
            >
                {isUnoptimized && (
                    <div className="absolute inset-0 bg-destructive/5 animate-pulse pointer-events-none" />
                )}

                <div className="flex flex-col gap-1 z-10 h-full justify-between py-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Target
                                size={14}
                                className={isUnoptimized ? "text-destructive animate-pulse" : "text-primary"}
                            />
                            <h2 className="text-muted-foreground uppercase tracking-[0.3em] text-[10px] font-black">
                                Yield Optimizer
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 mt-2" aria-live="polite">
                            <div
                                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                    isUnoptimized
                                        ? "bg-destructive shadow-[0_0_8px_var(--destructive)]"
                                        : "bg-primary shadow-[0_0_8px_var(--primary)]"
                                }`}
                            />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                                {loading
                                    ? "Syncing vault..."
                                    : isUnoptimized
                                      ? "Unoptimized Assets Detected"
                                      : "Strategies Optimal"}
                            </span>
                        </div>

                        {isUnoptimized && stats.total > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mt-3 flex items-center gap-2 px-2 py-1 rounded bg-destructive/10 border border-destructive/20 w-max"
                            >
                                <AlertTriangle size={10} className="text-destructive" />
                                <span className="text-[9px] font-black text-destructive uppercase tracking-tighter">
                                    IDLE: {stats.idle < 1000 ? `$${stats.idle.toFixed(2)}` : `$${(stats.idle / 1000).toFixed(1)}K`} ({stats.idlePct}%)
                                </span>
                            </motion.div>
                        )}

                        {/* Speculative warning — tokens earning nothing */}
                        {stats.speculative > 0 && stats.total > 0 && (
                            <div className="mt-1 text-[8px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                                +${stats.speculative < 1000 ? stats.speculative.toFixed(0) : `${(stats.speculative / 1000).toFixed(1)}K`} speculative (0% yield)
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (isUnoptimized) {
                                AppEventBus.emit("AGENT_COMMAND", {
                                    command: "Analyze treasury for yield optimization and advise strategy",
                                    source: "YieldOptimizer",
                                });
                            } else {
                                AppEventBus.emit("AGENT_COMMAND", {
                                    command: "Initiate auto-compound sequence for all active positions",
                                    source: "YieldOptimizer",
                                });
                            }
                        }}
                        aria-label={isUnoptimized ? "Deploy idle capital into yield strategies" : "Auto compound active positions"}
                        className={`flex items-center justify-center gap-2 px-5 py-2 border rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all w-fit shadow-md ${
                            isUnoptimized
                                ? "bg-primary text-primary-foreground border-primary hover:shadow-[0_0_20px_var(--primary)] scale-[1.02]"
                                : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                        }`}
                    >
                        {isUnoptimized ? "Deploy Capital" : "Auto Compound"}
                    </button>
                </div>

                {/* ─── Efficiency Ring ─────────────────────────────── */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <div
                        className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${
                            isUnoptimized ? "bg-destructive/30" : "bg-primary/30"
                        }`}
                    />

                    <div className="text-center z-10">
                        <span
                            className={`text-4xl font-black block tracking-tighter drop-shadow-sm ${
                                isUnoptimized ? "text-destructive" : "text-foreground"
                            }`}
                        >
                            {stats.apy}<span className="text-xl ml-0.5 opacity-80">%</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.25em]">
                            Weighted APY
                        </span>
                        {/* Data source indicator */}
                        {ratesLoaded && (
                            <span className={`block text-[7px] mt-0.5 uppercase tracking-wider ${stats.hasLiveRates ? "text-primary" : "text-muted-foreground/50"}`}>
                                {stats.hasLiveRates ? "● Live" : "○ Est."}
                            </span>
                        )}
                    </div>

                    <svg
                        className="absolute inset-0 w-full h-full -rotate-90 scale-[1.1]"
                        viewBox="0 0 100 100"
                        role="img"
                        aria-label={`Yield efficiency: ${stats.efficiency}%`}
                    >
                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--foreground)" strokeOpacity="0.03" strokeWidth="5" strokeDasharray="2, 1" />
                        <circle
                            cx="50" cy="50" r="42"
                            fill="transparent"
                            stroke={isUnoptimized ? "var(--destructive)" : "var(--primary)"}
                            strokeWidth="6"
                            strokeDasharray="264"
                            strokeDashoffset={264 - (264 * (stats.efficiency / 100))}
                            strokeLinecap="butt"
                            className="transition-all duration-[1500ms] ease-in-out"
                        />
                        <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--background)" strokeWidth="8" strokeDasharray="1, 4" />
                    </svg>

                    <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-foreground/10" />
                    <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-foreground/10" />
                    <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-foreground/10" />
                    <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-foreground/10" />

                    <div className="absolute -bottom-1 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border text-[9px] font-mono font-black text-foreground tracking-widest flex items-center gap-1.5 shadow-lg">
                        <div className={`w-1 h-1 rounded-full ${isUnoptimized ? "bg-destructive animate-pulse" : "bg-primary"}`} />
                        EFF: {stats.efficiency}%
                    </div>
                </div>
            </div>

            {/* ─── AI Strategy Overlay ────────────────────────────── */}
            <AnimatePresence>
                {showStrategy && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="AI Strategy Analysis"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStrategy(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                            {strategyStep === "ANALYZING" ? (
                                                <Cpu size={20} className="animate-spin" />
                                            ) : (
                                                <Zap size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
                                                {strategyStep === "ANALYZING"
                                                    ? "Agent Assessing Market..."
                                                    : "Tactical Deployment Plan"}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                Keystone Intelligence Layer
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            abortRef.current?.abort();
                                            setShowStrategy(false);
                                        }}
                                        aria-label="Close strategy modal"
                                        className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {strategyStep === "ANALYZING" ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-sm font-mono text-muted-foreground animate-pulse">
                                            Consulting Jupiter Aggregator for best routes...
                                        </p>
                                        <div className="flex gap-2 text-[10px] text-muted-foreground/50 font-mono">
                                            <span>JUP.AG</span>
                                            <span>SANCTUM</span>
                                            <span>MARINADE</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-5">
                                            {/* Execution Mode Indicator */}
                                            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                                                isMultisig
                                                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                                    : "bg-primary/10 border border-primary/20 text-primary"
                                            }`}>
                                                {isMultisig ? <Users size={12} /> : <Wallet size={12} />}
                                                {isMultisig ? "Multisig — Creates proposal for team approval" : "Direct — Executes via connected wallet"}
                                            </div>

                                            {/* Target Allocation */}
                                            <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-3">
                                                    Target Allocation
                                                </div>
                                                <div className="flex items-end justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-[11px] mb-1 font-mono items-center">
                                                            <span className="flex items-center gap-1.5">
                                                                <img
                                                                    src={
                                                                        liveData.strategyName === "mSOL" ? "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png"
                                                                        : liveData.strategyName === "JitoSOL" ? "https://storage.googleapis.com/token-metadata/JitoSOL-256.png"
                                                                        : liveData.strategyName === "bSOL" ? "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png"
                                                                        : "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png"
                                                                    }
                                                                    alt={liveData.strategyName}
                                                                    className="w-4 h-4 rounded-full"
                                                                />
                                                                Liquid Staking ({liveData.strategyName})
                                                            </span>
                                                            <span className="text-primary">85%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary w-[85%]" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-[11px] mb-1 font-mono items-center">
                                                            <span className="flex items-center gap-1.5">
                                                                <img
                                                                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                                                    alt="SOL"
                                                                    className="w-4 h-4 rounded-full"
                                                                />
                                                                Operational Buffer
                                                            </span>
                                                            <span>15%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                                            <div className="h-full bg-muted-foreground/20 w-[15%]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 rounded-2xl border border-border bg-background/50">
                                                    <div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">
                                                        {liveData.source === "live" ? "Live Market APY" : "Estimated APY"}
                                                    </div>
                                                    <div className="text-2xl font-black text-primary">
                                                        +{liveData.apy}%
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                                                        {liveData.source === "live"
                                                            ? "Source: Sanctum / Marinade"
                                                            : "Source: Conservative estimate"}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-2xl border border-border bg-background/50">
                                                    <div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">
                                                        Execution Route
                                                    </div>
                                                    <div className="text-base font-black text-foreground flex items-center gap-2">
                                                        <img src="https://static.jup.ag/jup/icon.png" alt="Jupiter" className="w-4 h-4 rounded-full" />
                                                        {liveData.quote ? "Jupiter (Best Price)" : "Scanning..."}
                                                    </div>
                                                    <div className="text-[9px] text-primary mt-1">
                                                        Impact: &lt; 0.1%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recommendation */}
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Agent detected{" "}
                                                <span className="text-foreground font-bold font-mono">
                                                    ${(stats.idle * 0.85).toLocaleString()}
                                                </span>{" "}
                                                idle. Recommendation: Swap to{" "}
                                                <span className="text-primary font-bold">
                                                    {liveData.strategyName}
                                                </span>{" "}
                                                immediately to capture {liveData.apy}% yield.
                                            </p>
                                        </div>

                                        {/* Execute Button — Wired to real execution */}
                                        <div className="mt-6 flex gap-3">
                                            <button
                                                disabled={deploying}
                                                onClick={async () => {
                                                    setDeploying(true);
                                                    try {
                                                        if (!txExecutor.isWalletConnected && !txExecutor.isMultisig) {
                                                            toast.error("No Wallet Connected", {
                                                                description: "Connect a wallet to execute this deployment.",
                                                            });
                                                            return;
                                                        }

                                                        const solPrice = vaultTokens.find(t => t.symbol === 'SOL')?.price || 150;
                                                        const idleSol = stats.idle / solPrice;
                                                        const deployAmount = idleSol * 0.85;

                                                        AppEventBus.emit("AGENT_LOG", {
                                                            message: txExecutor.isMultisig
                                                                ? `📋 Creating multisig proposal: Deploy ${deployAmount.toFixed(4)} SOL → ${liveData.strategyName}`
                                                                : `🔐 Requesting wallet signature: Deploy ${deployAmount.toFixed(4)} SOL → ${liveData.strategyName}`,
                                                            level: "SYSTEM",
                                                        });

                                                        // Shared hook handles both multisig (Squads proposal) and individual (wallet sign+send)
                                                        const result = await txExecutor.executeSwap({
                                                            inputToken: "SOL",
                                                            outputToken: liveData.strategyName,
                                                            amount: deployAmount,
                                                        });

                                                        if (!result.success) {
                                                            throw new Error(result.error || "Execution failed");
                                                        }

                                                        AppEventBus.emit("AGENT_LOG", {
                                                            message: result.signature
                                                                ? `✅ Deployment confirmed! Signature: ${result.signature}`
                                                                : `✅ Proposal created: ${result.proposalKey}. Awaiting ${vaultConfig?.threshold || "N/A"} signatures.`,
                                                            level: "SUCCESS",
                                                        });
                                                    } catch (err: any) {
                                                        console.error("Deployment failed:", err);
                                                        toast.error("Deployment Failed", {
                                                            description: err.message || "Check console for details.",
                                                        });
                                                        AppEventBus.emit("AGENT_LOG", {
                                                            message: `❌ Deployment failed: ${err.message}`,
                                                            level: "ERROR",
                                                        });
                                                    } finally {
                                                        setDeploying(false);
                                                        setShowStrategy(false);
                                                    }
                                                }}
                                                className={`flex-1 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                    deploying
                                                        ? "bg-muted text-muted-foreground cursor-wait"
                                                        : isMultisig
                                                            ? "bg-blue-500 text-white hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                                                            : "bg-primary text-primary-foreground hover:shadow-[0_0_30px_var(--primary)/30]"
                                                }`}
                                            >
                                                {deploying ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        {isMultisig ? "Creating Proposal..." : "Preparing Transaction..."}
                                                    </>
                                                ) : isMultisig ? (
                                                    <>
                                                        <Users size={14} />
                                                        Create Proposal
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap size={14} className="fill-current" />
                                                        Execute Deployment
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {/* Infrastructure Footer */}
                                        <div className="flex items-center justify-center gap-4 mt-5 pt-3 border-t border-border">
                                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                                <img src="https://static.jup.ag/jup/icon.png" alt="Jupiter" className="w-3 h-3 rounded-full opacity-50" />
                                                Jupiter
                                            </div>
                                            <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/20" />
                                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="Solana" className="w-3 h-3 rounded-full opacity-50" />
                                                Solana
                                            </div>
                                            {isMultisig && (
                                                <>
                                                    <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/20" />
                                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                                        <img src="https://pbs.twimg.com/profile_images/1654868465684652032/HkyaITC-_normal.png" alt="Squads" className="w-3 h-3 rounded-full opacity-50" />
                                                        Squads Protocol
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
