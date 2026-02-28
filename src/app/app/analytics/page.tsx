"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { PortfolioDonut } from "@/components/charts/PortfolioDonut";
import { PredictiveRunway } from "@/components/analytics/PredictiveRunway";
import { MarketSentiment } from "@/components/analytics/MarketSentiment";
import { TreasuryGrowthChart } from "@/components/analytics/TreasuryGrowthChart";
import { PnLTracker } from "@/components/analytics/PnLTracker";
import { FlowAnalysis } from "@/components/analytics/FlowAnalysis";
import { DeFiPositions } from "@/components/analytics/DeFiPositions";
import { ConcentrationRisk, computeMultiFactorRisk } from "@/components/analytics/ConcentrationRisk";
import { BenchmarkChart } from "@/components/analytics/BenchmarkChart";
import { FeeAnalysis } from "@/components/analytics/FeeAnalysis";
import { ExportPanel } from "@/components/analytics/ExportPanel";
import { RefreshCw, TrendingUp, ShieldAlert, BarChart3, X, Loader2, AlertTriangle } from "lucide-react";
import { ForesightIcon } from "@/components/icons";
import { WalletButton } from "@/components/WalletButton";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { useVault } from "@/lib/contexts/VaultContext";
import { Suspense } from "react";
import { NetworkSelector } from "@/components/NetworkSelector";
import { AppEventBus } from "@/lib/events";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { getTokenColor } from "@/lib/token-colors";
import { classifyToken, YIELD_MINTS } from "@/lib/yield-registry";

// ─── Types ───────────────────────────────────────────────────────
interface ActivityEntry {
    id: string;
    text: string;
    time: string;
    type: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
function computeYield(
    tokens: any[],
    totalValue: number | null,
    liveRates: Record<string, { apy: number; source?: string }> = {}
) {
    const total = totalValue || 0;
    if (total === 0) return { apy: 0, monthly: 0, projected: 0, efficiency: 0 };

    let yieldValue = 0;
    let weightedApySum = 0;

    for (const t of tokens) {
        const val = t.value || 0;
        if (val === 0) continue;
        const category = classifyToken(t.mint, t.symbol);
        if (category === "YIELD_BEARING") {
            yieldValue += val;
            const liveRate = liveRates[t.mint]?.apy;
            const registryFallback = YIELD_MINTS[t.mint]?.fallbackApy ?? 0;
            const tokenApy = liveRate ?? registryFallback;
            weightedApySum += val * tokenApy;
        }
    }

    const efficiency = parseFloat(((yieldValue / total) * 100).toFixed(1));
    // Portfolio-weighted APY (diluted across total value)
    const apy = parseFloat((weightedApySum / total).toFixed(2));
    // Yield-bearing-only APY (for yield assets only)
    const yieldApy = yieldValue > 0 ? parseFloat((weightedApySum / yieldValue).toFixed(2)) : 0;
    const monthly = parseFloat((apy / 12).toFixed(2));
    const projected = Math.round(total * (apy / 100));
    return { apy, yieldApy, monthly, projected, efficiency };
}

// ─── Component ──────────────────────────────────────────────────
export default function AnalyticsPage() {
    const { activeVault, vaultTokens, vaultValue, vaultChange24h, loading, stakeAccounts } = useVault();
    const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
    const logIdRef = useRef(0);

    // ─── Simulation Store ────────────────────────────────────────
    const sim = useSimulationStore();
    const simActive = sim.active;
    const simResult = sim.result;
    const simLoading = sim.loading;

    // ─── Live yield rates from /api/yield/rates ────────────────
    const [yieldRates, setYieldRates] = useState<Record<string, { apy: number; source?: string }>>({});
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/yield/rates");
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data.rates) setYieldRates(data.rates);
            } catch { /* fallback to registry */ }
        })();
        return () => { cancelled = true; };
    }, []);

    // ─── Activity Stream (real events from AppEventBus) ──────────
    useEffect(() => {
        const unsub = AppEventBus.subscribe((event) => {
            const id = String(++logIdRef.current);
            const now = new Date();
            const time = now.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit" });
            let text = "";
            switch (event.type) {
                case "REFRESH_DASHBOARD": text = "Dashboard refreshed"; break;
                case "NAVIGATE": text = `Navigated to ${event.payload?.path || "page"}`; break;
                case "UI_NOTIFICATION": text = event.payload?.message || "Notification"; break;
                case "AGENT_COMMAND": text = `Agent: ${event.payload?.command || "action"}`; break;
                case "AGENT_LOG": text = event.payload?.message || "Agent log"; break;
                default: text = event.type;
            }
            setActivityLog(prev => [{ id, text, time, type: event.type }, ...prev].slice(0, 10));
        });
        return unsub;
    }, []);

    // Unified Allocation Data from Context
    const allocationData = useMemo(() => {
        return vaultTokens
            .map(t => ({
                name: t.symbol || t.mint.substring(0, 4),
                value: t.value || 0,
                color: getTokenColor(t.symbol || t.mint.substring(0, 4)),
            }))
            .filter(t => t.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [vaultTokens]);

    // ─── Simulated Allocation (overlay on donut when sim active) ──
    const simulatedAllocation = useMemo(() => {
        if (!simActive || !simResult?.projection) return null;
        const endPoint = simResult.projection[simResult.projection.length - 1];
        if (!endPoint?.breakdown) return null;
        return Object.entries(endPoint.breakdown)
            .map(([name, value]) => ({ name, value: Math.round(value as number), color: getTokenColor(name) }))
            .filter(t => t.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [simActive, simResult]);

    // ─── Risk Score (multi-factor from ConcentrationRisk) ────────
    const realRisk = useMemo(() => {
        return computeMultiFactorRisk(vaultTokens, stakeAccounts, vaultChange24h);
    }, [vaultTokens, stakeAccounts, vaultChange24h]);

    const simRiskScore = useMemo(() => {
        if (!simActive || !simResult) return null;
        const flags = simResult.summary.riskFlags;
        let score = realRisk.overallScore;
        if (flags.includes("DEPLETION_RISK")) score += 4;
        if (flags.includes("MAJOR_DRAWDOWN")) score += 2;
        if (flags.includes("HIGH_BURN_RATE")) score += 1;
        for (const f of flags) { if (f.endsWith("_SEVERE_DECLINE")) score += 1; }
        return Math.min(10, score);
    }, [simActive, simResult, realRisk]);

    const displayRisk = simActive && simRiskScore != null
        ? { overallScore: simRiskScore, overallLabel: simRiskScore > 7 ? "CRITICAL" : simRiskScore > 5 ? "HIGH" : simRiskScore > 3 ? "MODERATE" : "LOW", factors: realRisk.factors }
        : realRisk;

    // ─── Yield Efficiency (real from vault tokens + live rates) ──
    const realYield = useMemo(() => computeYield(vaultTokens, vaultValue, yieldRates), [vaultTokens, vaultValue, yieldRates]);

    const simYield = useMemo(() => {
        if (!simActive || !simResult) return null;
        const deltaP = simResult.summary.deltaPercent;
        const months = simResult.metadata?.timeframeMonths || 12;
        return { apy: (deltaP / months) * 12, monthly: deltaP / months, projected: simResult.summary.delta };
    }, [simActive, simResult]);

    const displayAllocation = simulatedAllocation || (allocationData.length > 0 ? allocationData : [{ name: "Empty", value: 100, color: "#1c7a43" }]);
    const displayYield = simActive && simYield ? simYield : realYield;
    const hasVault = vaultTokens.length > 0;

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Analytics Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${simActive ? "bg-orange-500 animate-pulse" : "bg-primary"} shadow-[0_0_8px_var(--dashboard-accent-muted)]`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            {simActive ? "SIMULATION MODE" : "Keystone OS // Primary Node"}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <BarChart3 className={simActive ? "text-orange-500" : "text-primary"} size={20} />
                        <h1 className="text-lg font-bold tracking-tight text-foreground">Intelligence & Analytics</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {activeVault ? (
                        <div className="flex items-center gap-2 h-8 px-3 bg-primary/10 border border-primary/20 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-mono text-primary">{activeVault.slice(0, 4)}...{activeVault.slice(-4)}</span>
                            {loading && <RefreshCw className="animate-spin text-primary" size={10} />}
                        </div>
                    ) : (
                        <span className="text-[10px] text-muted-foreground/50 font-mono">No vault — connect via sidebar</span>
                    )}

                    <div className="w-px h-6 bg-border" />
                    <NetworkSelector />
                    <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
                        <CollaborativeHeader />
                    </Suspense>
                    <div className="w-px h-6 bg-border" />
                    <WalletButton />
                </div>
            </header>

            {/* Simulation Banner */}
            {simActive && (
                <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-2 shrink-0">
                            {simLoading ? (
                                <Loader2 size={14} className="animate-spin text-orange-500" />
                            ) : (
                                <ForesightIcon size={14} fillColor="currentColor" className="text-orange-500" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                                {simLoading ? "Computing..." : "Foresight Active"}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono text-orange-300/80 truncate">
                            &quot;{sim.prompt}&quot;
                        </span>
                        {simResult && (
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-[10px] font-mono text-muted-foreground">|</span>
                                <span className={`text-[10px] font-black font-mono ${simResult.summary.delta >= 0 ? "text-primary" : "text-destructive"}`}>
                                    {simResult.summary.deltaPercent >= 0 ? "+" : ""}{simResult.summary.deltaPercent.toFixed(1)}%
                                </span>
                                {simResult.summary.runwayMonths != null && (
                                    <span className="text-[10px] font-black text-destructive flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        Depletes in {simResult.summary.runwayMonths.toFixed(1)}mo
                                    </span>
                                )}
                                {simResult.summary.riskFlags.map((flag: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-destructive/10 text-[8px] font-black uppercase text-destructive">
                                        {flag.replace(/_/g, " ")}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => sim.clearSimulation()}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-wider transition-colors"
                    >
                        <X size={12} />
                        Exit Simulation
                    </button>
                </div>
            )}

            <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-[1600px] mx-auto">

                    {/* ═══ ROW 1: Growth Chart (4 cols) + Allocation Donut (2 cols) ═══ */}
                    <div className="md:col-span-4 lg:col-span-4">
                        <TreasuryGrowthChart />
                    </div>

                    <div className={`md:col-span-2 lg:col-span-2 rounded-2xl bg-card border p-6 backdrop-blur-xl shadow-sm flex flex-col overflow-hidden ${simActive ? "border-orange-500/30" : "border-border"}`}>
                        <span className={`text-[10px] uppercase tracking-widest font-semibold block mb-4 shrink-0 ${simActive ? "text-orange-500" : "text-muted-foreground"}`}>
                            {simActive ? "Projected Allocation" : "Allocation Mix"}
                        </span>
                        <div className="shrink-0">
                            <PortfolioDonut data={displayAllocation} />
                        </div>
                        {displayAllocation.length > 0 && !(displayAllocation.length === 1 && displayAllocation[0].name === "Empty") && (
                            <div className="mt-4 space-y-2 overflow-y-auto flex-1 min-h-0">
                                {displayAllocation.slice(0, 4).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-muted/30 border border-border shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || getTokenColor(item.name) }} />
                                            <span className="text-[10px] font-bold text-foreground">{item.name}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">${item.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ═══ ROW 2: Benchmark Comparison (4 cols) + P&L Tracker (2 cols) ═══ */}
                    <div className="md:col-span-4 lg:col-span-4">
                        <BenchmarkChart />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                        <PnLTracker />
                    </div>

                    {/* ═══ ROW 3: Inflow/Outflow (3 cols) + Fee Analysis (3 cols) ═══ */}
                    <div className="md:col-span-2 lg:col-span-3">
                        <FlowAnalysis />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                        <FeeAnalysis />
                    </div>

                    {/* ═══ ROW 4: Predictive Runway (4 cols) + DeFi Positions (2 cols) ═══ */}
                    <div className="md:col-span-4 lg:col-span-4">
                        <PredictiveRunway />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                        <DeFiPositions />
                    </div>

                    {/* ═══ ROW 5: Concentration Risk (2 cols) + Market Intelligence (2 cols) + Risk Score (1 col) + Yield (1 col) ═══ */}
                    <div className="md:col-span-2 lg:col-span-2">
                        <ConcentrationRisk />
                    </div>

                    <div className="md:col-span-2 lg:col-span-2">
                        <MarketSentiment />
                    </div>

                    {/* Risk Scorecard (multi-factor from ConcentrationRisk) */}
                    <div className={`md:col-span-1 lg:col-span-1 rounded-2xl bg-card border p-5 backdrop-blur-xl flex flex-col justify-between shadow-sm ${displayRisk.overallScore > 6 ? "border-destructive/30" : simActive ? "border-orange-500/30" : "border-border"}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert className={displayRisk.overallScore > 6 ? "text-destructive" : "text-primary"} size={12} />
                            <span className={`text-[9px] uppercase tracking-widest font-semibold ${simActive ? "text-orange-500" : "text-muted-foreground"}`}>
                                {simActive ? "Sim Risk" : "Risk"}
                            </span>
                        </div>
                        <div className="text-center py-2">
                            <span className={`text-4xl font-bold tracking-tighter ${
                                displayRisk.overallScore > 7 ? "text-destructive" : displayRisk.overallScore > 4 ? "text-orange-500" : "text-primary"
                            }`}>
                                {String(displayRisk.overallScore).padStart(2, "0")}
                            </span>
                            <span className="block text-[8px] text-muted-foreground mt-1 font-bold uppercase">
                                {displayRisk.overallLabel}
                            </span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-2">
                            <div
                                className={`h-full transition-all duration-700 ${
                                    displayRisk.overallScore > 7 ? "bg-destructive" : displayRisk.overallScore > 4 ? "bg-orange-500" : "bg-primary"
                                }`}
                                style={{ width: `${displayRisk.overallScore * 10}%` }}
                            />
                        </div>
                        {/* Mini factor breakdown */}
                        <div className="mt-3 space-y-1">
                            {displayRisk.factors.slice(0, 3).map(f => (
                                <div key={f.name} className="flex items-center justify-between">
                                    <span className="text-[7px] text-muted-foreground truncate">{f.name}</span>
                                    <span className={`text-[7px] font-bold ${f.score > 6 ? "text-destructive" : f.score > 3 ? "text-orange-500" : "text-primary"}`}>
                                        {f.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Yield Efficiency */}
                    <div className={`md:col-span-1 lg:col-span-1 rounded-2xl bg-card border p-5 backdrop-blur-xl flex flex-col justify-between shadow-sm ${simActive ? "border-orange-500/30" : "border-border"}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className={simActive ? "text-orange-500" : "text-primary"} size={12} />
                            <span className={`text-[9px] uppercase tracking-widest font-semibold ${simActive ? "text-orange-500" : "text-muted-foreground"}`}>
                                {simActive ? "Sim Yield" : "Yield"}
                            </span>
                        </div>
                        <div className="text-center py-2">
                            <span className={`text-3xl font-bold tracking-tighter text-foreground`}>
                                {hasVault || simActive
                                    ? Math.abs((displayYield as any).yieldApy || displayYield.apy).toFixed(1)
                                    : "—"}
                                {(hasVault || simActive) && <span className="text-xl text-primary">%</span>}
                            </span>
                            <span className="block text-[8px] text-muted-foreground mt-1 font-bold uppercase">
                                {simActive ? "SIM APY" : hasVault ? "YIELD-BEARING APY" : "NO VAULT"}
                            </span>
                        </div>
                        <div className="space-y-1 mt-2 border-t border-border pt-2">
                            <div className="flex justify-between">
                                <span className="text-[8px] text-muted-foreground">Portfolio APY</span>
                                <span className={`text-[9px] font-bold ${displayYield.apy < 0 ? "text-destructive" : "text-primary"}`}>
                                    {hasVault || simActive ? `${displayYield.apy.toFixed(2)}%` : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[8px] text-muted-foreground">Annual Est.</span>
                                <span className={`text-[9px] font-bold ${displayYield.projected < 0 ? "text-destructive" : "text-foreground"}`}>
                                    {hasVault || simActive
                                        ? `${displayYield.projected >= 0 ? "+" : ""}$${Math.abs(displayYield.projected).toLocaleString()}`
                                        : "—"}
                                </span>
                            </div>
                            {!simActive && (
                                <div className="flex justify-between">
                                    <span className="text-[8px] text-muted-foreground">Deployed</span>
                                    <span className="text-[9px] font-bold text-primary">
                                        {hasVault ? `${(displayYield as any).efficiency?.toFixed(0) ?? 0}%` : "—"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ ROW 6: Activity Stream (2 cols) + Export Panel (4 cols) ═══ */}
                    <div className="md:col-span-2 lg:col-span-2 rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">
                            {simActive ? "Simulation Log" : "Activity Stream"}
                        </span>
                        <div className="space-y-4">
                            {simActive && simResult ? (
                                <>
                                    <div className="flex gap-3 items-start">
                                        <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[10px]"><ForesightIcon size={10} fillColor="currentColor" className="text-orange-500" /></div>
                                        <div>
                                            <p className="text-[10px] leading-tight text-foreground font-medium">Foresight simulation executed</p>
                                            <span className="text-[8px] text-muted-foreground font-bold">Just now</span>
                                        </div>
                                    </div>
                                    {simResult.summary.riskFlags.map((flag: string, i: number) => (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded bg-destructive/10 border border-destructive/20 flex items-center justify-center text-[10px]"><AlertTriangle size={10} className="text-destructive" /></div>
                                            <div>
                                                <p className="text-[10px] leading-tight text-foreground font-medium">{flag.replace(/_/g, " ")}</p>
                                                <span className="text-[8px] text-muted-foreground font-bold">Warning</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-3 items-start opacity-70">
                                        <div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-[10px] font-mono text-foreground">→</div>
                                        <div>
                                            <p className="text-[10px] leading-tight text-foreground font-medium">
                                                End value: ${simResult.summary.projectedEndValue.toLocaleString()}
                                            </p>
                                            <span className="text-[8px] text-muted-foreground font-bold">
                                                {simResult.summary.deltaPercent >= 0 ? "+" : ""}{simResult.summary.deltaPercent.toFixed(1)}% from current
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : activityLog.length > 0 ? (
                                activityLog.slice(0, 5).map(entry => (
                                    <div key={entry.id} className="flex gap-3 items-start opacity-80">
                                        <div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center text-[10px] font-mono text-foreground shrink-0">
                                            {entry.type === "AGENT_COMMAND" ? "" : entry.type === "REFRESH_DASHBOARD" ? "↻" : "•"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] leading-tight text-foreground font-medium truncate">{entry.text}</p>
                                            <span className="text-[8px] text-muted-foreground font-bold">{entry.time}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <span className="text-[10px] text-muted-foreground/50 font-mono uppercase">No activity yet</span>
                                    <p className="text-[9px] text-muted-foreground/30 mt-1">Events will appear as you interact</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-4 lg:col-span-4">
                        <ExportPanel />
                    </div>

                </div>
            </main>
        </div>
    );
}
