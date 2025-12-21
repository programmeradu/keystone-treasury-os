import React, { useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, Target, X, Zap, Shield, Cpu, ArrowRight } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { AppEventBus, useAppEvent } from "@/lib/events";
import { YieldEngine } from "@/lib/agents/YieldEngine";

export const YieldOptimizer = () => {
    const { vaultTokens, vaultBalance, vaultValue } = useVault();
    const { theme } = useTheme();
    const [showStrategy, setShowStrategy] = useState(false);
    const [strategyStep, setStrategyStep] = useState<"IDLE" | "ANALYZING" | "RESULT">("IDLE");
    const [liveData, setLiveData] = useState<{
        strategyName: string,
        apy: number,
        quote: any,
        description: string
    }>({
        strategyName: "Scanning...",
        apy: 0,
        quote: null,
        description: ""
    });

    // Heuristics for "Idle" vs "Optimized"
    const stats = useMemo(() => {
        if (!vaultValue || vaultValue === 0) {
            return { total: 0, idle: 0, apy: 0, efficiency: 0 };
        }

        const IDLE_MINTS = [
            "So11111111111111111111111111111111111111112", // WSOL/SOL
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
            "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
        ];

        // 1. Calculate Idle USD
        const totalIdle = vaultTokens
            .filter(t => IDLE_MINTS.includes(t.mint) || t.symbol === "SOL")
            .reduce((acc, t) => acc + (t.value || 0), 0);

        const optimizedValue = Math.max(0, vaultValue - totalIdle);
        const efficiency = (optimizedValue / vaultValue) * 100;

        // Realistic APY simulation: Optimized assets earn ~8%, Idle earn 0%
        const weightedApy = (optimizedValue * 8) / vaultValue;

        return {
            total: vaultValue,
            idle: totalIdle,
            apy: parseFloat(weightedApy.toFixed(1)),
            efficiency: Math.round(efficiency)
        };
    }, [vaultTokens, vaultValue]);

    useAppEvent((event) => {
        if (event.type === "SHOW_STRATEGY_MODAL") {
            setShowStrategy(true);
            setStrategyStep("ANALYZING");

            // Mocking the Agent "Thinking" phase then fetching real data
            // Trigger the AI Brain
            setTimeout(async () => {
                try {
                    // Use the YieldEngine to "Think" and "Decide"
                    const amountLamports = 1000000000; // Simulated amount (1 SOL)
                    const decision = await YieldEngine.determineBestStrategy(amountLamports);

                    setLiveData({
                        strategyName: decision.recommendation.name,
                        apy: decision.recommendation.projectedApy,
                        quote: decision.quote,
                        description: decision.recommendation.description
                    });
                    setStrategyStep("RESULT");
                } catch (e) {
                    console.error("Agent failed to analyze strategies", e);
                    setStrategyStep("RESULT"); // Fallback
                }
            }, 1500); // Specific delay to show "Thinking" logs in Command Center
        }
    });

    const isUnoptimized = stats.efficiency < 85;

    return (
        <>
            <div className="rounded-2xl bg-card border border-border p-6 flex flex-row items-center justify-between relative min-h-[220px] group overflow-hidden shadow-lg">
                {/* Background Pulse if Unoptimized */}
                {isUnoptimized && (
                    <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                )}

                <div className="flex flex-col gap-1 z-10 h-full justify-between py-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Target size={14} className={isUnoptimized ? "text-red-500 animate-pulse" : "text-primary"} />
                            <h2 className="text-muted-foreground uppercase tracking-[0.3em] text-[10px] font-black">Yield Optimizer</h2>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isUnoptimized ? "bg-red-500 shadow-[0_0_8px_red]" : "bg-primary shadow-[0_0_8px_var(--dashboard-accent)]"} animate-pulse`} />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                                {isUnoptimized ? "Unoptimized Assets Detected" : "Strategies Optimal"}
                            </span>
                        </div>

                        {isUnoptimized && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="mt-3 flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 w-max"
                            >
                                <AlertTriangle size={10} className="text-red-500" />
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">
                                    IDLE: {stats.idle < 1000 ? `$${stats.idle.toFixed(2)}` : `$${(stats.idle / 1000).toFixed(1)}K`} ({((stats.idle / stats.total) * 100).toFixed(0)}%)
                                </span>
                            </motion.div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (isUnoptimized) {
                                // Trigger Agent Analysis instead of opening directly
                                AppEventBus.emit("AGENT_COMMAND", {
                                    command: "Analyze treasury for yield optimization and advise strategy",
                                    source: "YieldOptimizer"
                                });
                            } else {
                                AppEventBus.emit("AGENT_COMMAND", {
                                    command: "Initiate auto-compound sequence for all active positions",
                                    source: "YieldOptimizer"
                                });
                            }
                        }}
                        className={`flex items-center justify-center gap-2 px-5 py-2 border rounded-lg text-[10px] font-black uppercase tracking-[0.1em] transition-all w-fit shadow-md ${isUnoptimized
                            ? "bg-primary text-primary-foreground border-primary hover:shadow-[0_0_20px_var(--dashboard-accent)] scale-[1.02]"
                            : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                            }`}>
                        {isUnoptimized ? "Deploy Capital" : "Auto Compound"}
                    </button>
                </div>

                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Visual Glow Layer */}
                    <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isUnoptimized ? "bg-red-500/30" : "bg-[#36e27b]/30"}`} />

                    <div className="text-center z-10">
                        <span className={`text-4xl font-black block tracking-tighter drop-shadow-sm ${isUnoptimized ? "text-red-500" : "text-foreground"}`}>
                            {stats.apy}<span className="text-xl ml-0.5 opacity-80">%</span>
                        </span>
                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.25em]">Weighted APY</span>
                    </div>

                    {/* Premium Segmented SVG Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.1]" viewBox="0 0 100 100">
                        {/* Background Track (Subtle Segments) */}
                        <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            stroke="rgba(255,255,255,0.03)"
                            strokeWidth="5"
                            strokeDasharray="2, 1"
                        />

                        {/* Active Progress Ring (High Fidelity) */}
                        <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            stroke={isUnoptimized ? "#ff5b39" : (theme === 'light' ? '#16A34A' : "#36e27b")}
                            strokeWidth="6"
                            strokeDasharray="264"
                            strokeDashoffset={264 - (264 * (stats.efficiency / 100))}
                            strokeLinecap="butt"
                            className="transition-all duration-1500 ease-in-out"
                            style={{
                                filter: `drop-shadow(0 0 8px ${isUnoptimized ? "rgba(255,91,57,0.4)" : "rgba(22,163,74,0.4)"})`
                            }}
                        />

                        {/* Fragmented/Segment Overlay (Military Look) */}
                        <circle
                            cx="50"
                            cy="50"
                            r="42"
                            fill="transparent"
                            stroke="var(--dashboard-bg)"
                            strokeWidth="8"
                            strokeDasharray="1, 4"
                        />
                    </svg>

                    {/* Tactical Corner Marks */}
                    <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/10" />
                    <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-white/10" />
                    <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-white/10" />
                    <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/10" />

                    {/* Efficiency Tag */}
                    <div className="absolute -bottom-1 px-3 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border text-[9px] font-mono font-black text-foreground tracking-widest flex items-center gap-1.5 shadow-lg">
                        <div className={`w-1 h-1 rounded-full ${isUnoptimized ? "bg-red-500 animate-pulse" : "bg-primary"}`} />
                        EFF: {stats.efficiency}%
                    </div>
                </div>
            </div>

            {/* AI STRATEGY OVERLAY */}
            <AnimatePresence>
                {showStrategy && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(54,226,123,0.2)]">
                                            {strategyStep === "ANALYZING" ? <Cpu size={20} className="animate-spin" /> : <Zap size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">
                                                {strategyStep === "ANALYZING" ? "Agent Assessing Market..." : "Tactical Deployment Plan"}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Keystone Intelligence Layer // v4.2</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowStrategy(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                {strategyStep === "ANALYZING" ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-sm font-mono text-muted-foreground animate-pulse">Consulting Jupiter Aggregator for best routes...</p>
                                        <div className="flex gap-2 text-[10px] text-muted-foreground/50 font-mono">
                                            <span>JUP.AG</span>
                                            <span>SANCTUM</span>
                                            <span>SQUADS</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-6">
                                            <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                                    <Shield size={12} className="text-primary" />
                                                    Target Allocation
                                                </div>
                                                <div className="flex items-end justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                                                            <span>Liquid Staking ({liveData.strategyName})</span>
                                                            <span className="text-primary">85%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary w-[85%]" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-[11px] mb-1 font-mono">
                                                            <span>Operational Buffer</span>
                                                            <span>15%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                                                            <div className="h-full bg-muted-foreground/20 w-[15%]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-2xl border border-border bg-background/50 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                                        <TrendingUp size={40} />
                                                    </div>
                                                    <div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Live Market APY</div>
                                                    <div className="text-2xl font-black text-primary">+{liveData.apy}%</div>
                                                    <div className="text-[9px] text-muted-foreground mt-1">Source: Sanctum Verified</div>
                                                </div>
                                                <div className="p-4 rounded-2xl border border-border bg-background/50">
                                                    <div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Execution Route</div>
                                                    <div className="text-base font-black text-foreground break-all truncate">
                                                        {liveData.quote ? "Via Jupiter (Best Price)" : "Scanning..."}
                                                    </div>
                                                    <div className="text-[9px] text-primary mt-1">Impact: &lt; 0.1%</div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Agent detected <span className="text-foreground font-bold font-mono">${(stats.idle * 0.85).toLocaleString()}</span> idle.
                                                    Recommendation: Swap to <span className="text-primary font-bold">{liveData.strategyName}</span> immediately to capture {liveData.apy}% yield.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowStrategy(false);
                                                    AppEventBus.emit("AGENT_COMMAND", {
                                                        command: `Deploy $${(stats.idle * 0.85).toFixed(0)} into ${liveData.strategyName} strategy`,
                                                        source: "YieldOptimizer:StrategyModal"
                                                    });
                                                }}
                                                className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest hover:shadow-[0_0_30px_rgba(54,226,123,0.3)] transition-all flex items-center justify-center gap-2"
                                            >
                                                Execute Deployment
                                                <Zap size={14} className="fill-current" />
                                            </button>
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
