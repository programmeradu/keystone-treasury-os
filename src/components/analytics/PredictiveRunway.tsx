"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { toast } from "@/lib/toast-notifications";
import { useVault } from "@/lib/contexts/VaultContext";
import { PlayCircle, Loader2, RefreshCw, Shield, WifiOff, Wifi, DollarSign, Users, Percent } from "lucide-react";
import { Logo } from "@/components/icons";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { Slider } from "@/components/ui/slider";

// ─── Types ──────────────────────────────────────────────────────────

interface SimulationSummary {
    currentValue: number;
    projectedEndValue: number;
    delta: number;
    deltaPercent: number;
    runwayMonths: number | null;
    depletionDate: string | null;
    riskFlags: string[];
}

interface ProjectionPoint {
    date: string;
    totalValue: number;
    breakdown: Record<string, number>;
}

interface SimulationResponse {
    projection: ProjectionPoint[];
    summary: SimulationSummary;
    metadata?: { priceSource?: string; confidence?: number; stablecoinPct?: number };
}

interface LivePriceData {
    prices: Record<string, number>;
    source: string;
    fetchedAt: number;
}

// ─── Stablecoin detection (shared with server) ──────────────────────

const STABLECOIN_SYMBOLS = new Set([
    "USDC", "USDT", "BUSD", "DAI", "TUSD", "USDP", "FRAX", "LUSD",
    "PYUSD", "GUSD", "USDD", "CUSD", "SUSD", "UST", "EURC",
]);

// ─── Fallback: client-side baseline (ghost line) ────────────────────

const generateBaselineData = (startAmount: number, monthlyBurn: number) => {
    const data = [];
    let baseline = startAmount;
    const now = new Date();
    for (let i = 0; i < 18; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        baseline = Math.max(0, baseline - monthlyBurn);
        data.push({
            date: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            value: 0,
            baseline: Math.round(baseline),
        });
    }
    return data;
};

// ─── Component ──────────────────────────────────────────────────────

export const PredictiveRunway = () => {
    const { activeVault, vaultBalance, vaultTokens } = useVault();
    const foresight = useSimulationStore();
    const foresightActive = foresight.active && !!foresight.result;
    const [burnRate, setBurnRate] = useState(45000);
    const [newHires, setNewHires] = useState(0);
    const [revenueImpact, setRevenueImpact] = useState(0);

    // Server-side simulation state
    const [simData, setSimData] = useState<SimulationResponse | null>(null);
    const [simLoading, setSimLoading] = useState(false);
    const [simError, setSimError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastFlagsRef = useRef<string>("");

    // Live price state
    const [livePrices, setLivePrices] = useState<LivePriceData | null>(null);
    const [priceLoading, setPriceLoading] = useState(false);

    const hasVault = vaultTokens && vaultTokens.length > 0;
    const treasuryBalance = vaultBalance || 0;

    // ─── Fetch Live Prices ───────────────────────────────────────
    const fetchLivePrices = useCallback(async () => {
        if (!hasVault) return;
        setPriceLoading(true);
        try {
            const symbols = vaultTokens.map(t => t.symbol).filter(Boolean).join(",");
            if (!symbols) return;
            const res = await fetch(`/api/jupiter/price?ids=${encodeURIComponent(symbols)}`);
            if (!res.ok) throw new Error("Price fetch failed");
            const json = await res.json();
            const prices: Record<string, number> = {};
            const data = json.data || {};
            for (const [key, val] of Object.entries(data)) {
                prices[key] = (val as any).price || 0;
            }
            setLivePrices({
                prices,
                source: json.fallback || "jupiter",
                fetchedAt: Date.now(),
            });
        } catch (err) {
            console.warn("[PredictiveRunway] Price fetch failed, using vault prices:", err);
        } finally {
            setPriceLoading(false);
        }
    }, [hasVault, vaultTokens]);

    // Auto-fetch prices on mount and when vault changes
    useEffect(() => {
        fetchLivePrices();
    }, [fetchLivePrices]);

    // Determine price source and freshness
    const priceSource = useMemo<"live" | "vault" | "fallback">(() => {
        if (livePrices && Date.now() - livePrices.fetchedAt < 5 * 60 * 1000) return "live";
        if (hasVault) return "vault";
        return "fallback";
    }, [livePrices, hasVault]);

    const priceAge = useMemo(() => {
        if (!livePrices) return null;
        const seconds = Math.floor((Date.now() - livePrices.fetchedAt) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    }, [livePrices, simData]); // recalc when sim runs

    // Build portfolio with live prices, stablecoin tags, and 24h change
    const portfolio = useMemo(() => {
        if (!hasVault) return [];
        return vaultTokens.map(t => {
            const symbol = t.symbol || "SPL";
            const livePrice = livePrices?.prices[symbol];
            return {
                symbol,
                amount: t.amount || 0,
                price: livePrice != null && livePrice > 0 ? livePrice : (t.price || 0),
                change24h: t.change24h || 0,
                isStable: STABLECOIN_SYMBOLS.has(symbol.toUpperCase()),
                mint: t.mint || undefined,
            };
        });
    }, [vaultTokens, livePrices, hasVault]);

    // ─── Server-Side Simulation Call ─────────────────────────────
    const runSimulation = useCallback(async () => {
        if (portfolio.length === 0) return;
        setSimLoading(true);
        setSimError(null);

        const additionalBurn = newHires * 8000;
        const revenueOffset = burnRate * revenueImpact;
        const effectiveBurn = burnRate + additionalBurn - revenueOffset;

        const variables: { id: string; label: string; type: string; value: number; unit: string }[] = [
            {
                id: "burn_rate",
                label: "Monthly Burn",
                type: "burn_rate",
                value: effectiveBurn,
                unit: "usd",
            },
        ];

        if (revenueOffset > 0) {
            variables.push({
                id: "revenue_inflow",
                label: "Revenue Inflow",
                type: "inflow",
                value: revenueOffset,
                unit: "usd",
            });
        }

        try {
            const res = await fetch("/api/simulation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    portfolio,
                    variables,
                    timeframeMonths: 18,
                    granularity: "monthly",
                    priceSource,
                }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Simulation returned ${res.status}`);
            }

            const result: SimulationResponse = await res.json();
            setSimData(result);

            // Toast on risk flag changes only (prevents spam while dragging sliders)
            const flagsKey = result.summary.riskFlags.sort().join(",");
            if (flagsKey !== lastFlagsRef.current) {
                const prevKey = lastFlagsRef.current;
                lastFlagsRef.current = flagsKey;
                const flags = result.summary.riskFlags;
                if (flags.includes("DEPLETION_RISK")) {
                    toast.warning("Depletion risk detected", {
                        description: `Treasury depletes in ~${result.summary.runwayMonths?.toFixed(1)} months`,
                    });
                } else if (flags.includes("MAJOR_DRAWDOWN")) {
                    toast.warning("Major drawdown projected", {
                        description: `${result.summary.deltaPercent.toFixed(1)}% decline over 18 months`,
                    });
                } else if (flags.length === 0 && prevKey !== "") {
                    toast.success("Risk cleared", { description: "Treasury projection is now healthy" });
                }
            }
        } catch (err: any) {
            console.error("[PredictiveRunway] Simulation error:", err);
            setSimError(err.message || "Simulation failed");
            toast.error("Simulation engine error", { description: err.message });
        } finally {
            setSimLoading(false);
        }
    }, [portfolio, burnRate, newHires, revenueImpact, priceSource]);

    // Debounced auto-run when sliders change
    useEffect(() => {
        if (portfolio.length === 0) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            runSimulation();
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [runSimulation, portfolio.length]);

    // ─── Chart Data ──────────────────────────────────────────────
    const baselineData = useMemo(() => generateBaselineData(treasuryBalance, burnRate), [treasuryBalance, burnRate]);

    const chartData = useMemo(() => {
        // When Foresight simulation is active, overlay its projection as a third line
        if (foresightActive && foresight.result?.projection) {
            const fProj = foresight.result.projection;
            const internalProj = simData?.projection;
            // Use foresight projection length as reference
            return fProj.map((point, i) => {
                const dateObj = new Date(point.date);
                return {
                    date: dateObj.toLocaleString('default', { month: 'short', year: '2-digit' }),
                    value: internalProj?.[i] ? Math.round(internalProj[i].totalValue) : 0,
                    foresight: Math.round(point.totalValue),
                    baseline: baselineData[i]?.baseline ?? 0,
                };
            });
        }
        if (!simData?.projection) return baselineData;

        return simData.projection.map((point, i) => {
            const dateObj = new Date(point.date);
            return {
                date: dateObj.toLocaleString('default', { month: 'short', year: '2-digit' }),
                value: Math.round(point.totalValue),
                baseline: baselineData[i]?.baseline ?? 0,
            };
        });
    }, [simData, baselineData, foresightActive, foresight.result]);

    // Use foresight runway when active, otherwise internal sim
    const effectiveSummary = foresightActive ? foresight.result!.summary : simData?.summary;
    const runwayMonths = effectiveSummary?.runwayMonths ?? null;
    const hasDepletion = runwayMonths !== null && runwayMonths !== undefined;
    const confidence = simData?.metadata?.confidence ?? 0;
    const stablePct = simData?.metadata?.stablecoinPct ?? 0;

    const runwayLabel = hasDepletion
        ? `${runwayMonths.toFixed(1)} Months`
        : (simData || foresightActive) ? "18+ Months" : "—";

    // ─── Empty state ─────────────────────────────────────────────
    if (!hasVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl relative group overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <PlayCircle className="text-muted-foreground" size={14} />
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Predictive Intelligence</span>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <WifiOff size={28} className="text-muted-foreground/30 mb-3" />
                    <h3 className="text-sm font-bold text-muted-foreground mb-1">No Vault Connected</h3>
                    <p className="text-[10px] text-muted-foreground/60 max-w-xs">
                        Enter a vault PDA address above to unlock predictive runway analysis with real-time prices and stablecoin-aware burn modeling.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl bg-card border p-6 backdrop-blur-xl relative group overflow-hidden shadow-sm ${foresightActive ? "border-orange-500/30" : "border-border"}`}>
            <div className="flex flex-col xl:flex-row justify-between items-start mb-6 gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <PlayCircle className={`${foresightActive ? "text-orange-500" : "text-primary"} animate-pulse`} size={14} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${foresightActive ? "text-orange-500" : "text-muted-foreground"}`}>
                            {foresightActive ? "Foresight Overlay" : "Predictive Intelligence"}
                        </span>
                        {simLoading && <Loader2 size={10} className="animate-spin text-primary" />}
                        {foresightActive && <Logo size={10} fillColor="#f97316" />}
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                        {runwayLabel} Runway
                    </h3>

                    {/* Price freshness + confidence bar */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            {priceSource === "live" ? (
                                <Wifi size={10} className="text-primary" />
                            ) : (
                                <WifiOff size={10} className="text-muted-foreground/50" />
                            )}
                            <span className="text-[9px] font-mono text-muted-foreground">
                                {priceSource === "live"
                                    ? `Live • ${livePrices?.source || "jupiter"} • ${priceAge}`
                                    : priceSource === "vault"
                                        ? "Vault snapshot"
                                        : "No price data"}
                            </span>
                            <button
                                onClick={fetchLivePrices}
                                disabled={priceLoading}
                                className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                                title="Refresh prices"
                            >
                                <RefreshCw size={9} className={`text-muted-foreground ${priceLoading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                        {simData && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Shield size={9} className={confidence > 0.7 ? "text-primary" : confidence > 0.4 ? "text-orange-500" : "text-destructive"} />
                                    <span className="text-[9px] font-mono text-muted-foreground">
                                        {Math.round(confidence * 100)}% confidence
                                    </span>
                                    <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${confidence > 0.7 ? "bg-primary" : confidence > 0.4 ? "bg-orange-500" : "bg-destructive"}`}
                                            style={{ width: `${confidence * 100}%` }}
                                        />
                                    </div>
                                </div>
                                {stablePct > 0 && (
                                    <span className="text-[9px] font-mono text-muted-foreground/60">
                                        {stablePct.toFixed(1)}% stablecoins
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Scenario Sliders — all 3 feed into /api/simulation */}
                <div className="w-full xl:w-80 space-y-5 bg-muted/30 p-4 rounded-xl border border-border">
                    {/* Burn Rate Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <DollarSign size={12} className="text-primary" />
                                <span>Monthly Burn</span>
                            </div>
                            <span className="text-foreground font-mono">${(burnRate / 1000).toFixed(0)}K</span>
                        </div>
                        <Slider
                            value={[burnRate]}
                            onValueChange={([v]) => setBurnRate(v)}
                            min={5000}
                            max={200000}
                            step={5000}
                            className="[&_[role=slider]]:bg-primary"
                        />
                    </div>

                    {/* New Hires Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Users size={12} className="text-primary" />
                                <span>New Hires</span>
                            </div>
                            <span className="text-foreground">+{newHires} <span className="text-muted-foreground/60">({newHires > 0 ? `+$${(newHires * 8).toFixed(0)}K/mo` : "—"})</span></span>
                        </div>
                        <Slider
                            value={[newHires]}
                            onValueChange={([v]) => setNewHires(v)}
                            max={20}
                            step={1}
                            className="[&_[role=slider]]:bg-primary"
                        />
                    </div>

                    {/* Revenue Shift Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Percent size={12} className="text-primary" />
                                <span>Revenue Shift</span>
                            </div>
                            <span className={revenueImpact >= 0 ? "text-primary" : "text-destructive"}>
                                {revenueImpact > 0 ? "+" : ""}{(revenueImpact * 100).toFixed(0)}%
                            </span>
                        </div>
                        <Slider
                            value={[revenueImpact * 100]}
                            onValueChange={([v]) => setRevenueImpact(v / 100)}
                            min={-50}
                            max={50}
                            step={5}
                            className="[&_[role=slider]]:bg-primary"
                        />
                    </div>

                    {/* Engine Badge */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Powered by /api/simulation Trust Layer
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[250px] w-full relative">
                {simLoading && !simData && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRunway" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={hasDepletion ? "var(--destructive)" : "var(--dashboard-accent)"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={hasDepletion ? "var(--destructive)" : "var(--dashboard-accent)"} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--dashboard-foreground)" stopOpacity={0.05} />
                                <stop offset="95%" stopColor="var(--dashboard-foreground)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--dashboard-muted-foreground)", fontSize: 10, fontWeight: "bold" }}
                            minTickGap={20}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--dashboard-background)",
                                border: "1px solid var(--dashboard-border)",
                                borderRadius: "12px",
                                fontSize: "10px",
                                color: "var(--dashboard-foreground)",
                                textTransform: "uppercase",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                            }}
                            cursor={{ stroke: 'var(--dashboard-accent)', strokeDasharray: '5 5' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                        />
                        <ReferenceLine y={0} stroke="var(--dashboard-border)" strokeDasharray="3 3" />

                        <Area
                            type="monotone"
                            dataKey="baseline"
                            stroke="var(--dashboard-muted-foreground)"
                            strokeWidth={1}
                            strokeOpacity={0.2}
                            strokeDasharray="5 5"
                            fillOpacity={1}
                            fill="url(#colorBaseline)"
                            name="Baseline"
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={hasDepletion ? "var(--destructive)" : "var(--dashboard-accent)"}
                            strokeWidth={foresightActive ? 1.5 : 3}
                            fillOpacity={foresightActive ? 0.3 : 1}
                            fill="url(#colorRunway)"
                            name="Burn Model"
                        />
                        {foresightActive && (
                            <Area
                                type="monotone"
                                dataKey="foresight"
                                stroke="#f97316"
                                strokeWidth={3}
                                fillOpacity={0.15}
                                fill="#f9731620"
                                name="Foresight"
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
