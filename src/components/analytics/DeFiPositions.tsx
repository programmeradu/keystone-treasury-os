"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useVault } from "@/lib/contexts/VaultContext";
import { classifyToken, YIELD_MINTS, NATIVE_STAKING_MINT } from "@/lib/yield-registry";
import { Loader2, Layers, Shield, TrendingUp } from "lucide-react";
import { Logo } from "@/components/icons";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { getTokenColor } from "@/lib/token-colors";

interface YieldRate {
    apy: number;
    source?: string;
    protocol?: string;
    symbol?: string;
}

export const DeFiPositions = () => {
    const { activeVault, vaultTokens, stakeAccounts, totalStakedSol } = useVault();
    const sim = useSimulationStore();
    const simActive = sim.active && !!sim.result;
    const [yieldRates, setYieldRates] = useState<Record<string, YieldRate>>({});
    const [solPrice, setSolPrice] = useState(0);
    const [loading, setLoading] = useState(false);

    // Fetch live yield rates + SOL price in parallel
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.allSettled([
            fetch("/api/yield/rates").then(r => r.json()),
            fetch("https://price.jup.ag/v6/price?ids=SOL").then(r => r.json()),
        ]).then(([yieldRes, priceRes]) => {
            if (cancelled) return;
            if (yieldRes.status === "fulfilled" && yieldRes.value?.rates) setYieldRates(yieldRes.value.rates);
            if (priceRes.status === "fulfilled") setSolPrice(priceRes.value?.data?.SOL?.price || 0);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    // Categorize positions
    const positions = useMemo(() => {
        const items: {
            name: string;
            protocol: string;
            value: number;
            amount: number;
            symbol: string;
            apy: number;
            apySource: string;
            monthlyYield: number;
            type: "native_stake" | "lst" | "stablecoin_yield" | "idle";
        }[] = [];

        // Resolve SOL price: from vault tokens first, then from fetched price
        const resolvedSolPrice = (() => {
            const solToken = vaultTokens.find(t => t.symbol === "SOL" && t.price && t.price > 0);
            if (solToken?.price) return solToken.price;
            const stakedToken = vaultTokens.find(t => t.symbol === "Staked SOL" && t.price && t.price > 0);
            if (stakedToken?.price) return stakedToken.price;
            return solPrice; // fallback to Jupiter-fetched price
        })();

        // Native stake accounts
        if (stakeAccounts && stakeAccounts.length > 0) {
            const rate = yieldRates[NATIVE_STAKING_MINT];
            const apy = rate?.apy ?? YIELD_MINTS[NATIVE_STAKING_MINT]?.fallbackApy ?? 6.5;

            for (const sa of stakeAccounts) {
                const solValue = (sa.activeLamports || 0) / 1e9;
                const usdValue = solValue * resolvedSolPrice;

                items.push({
                    name: `Validator ${sa.validator?.substring(0, 8)}...`,
                    protocol: "Native Staking",
                    value: usdValue,
                    amount: solValue,
                    symbol: "SOL",
                    apy,
                    apySource: rate?.source || "fallback",
                    monthlyYield: (usdValue * apy / 100) / 12,
                    type: "native_stake",
                });
            }
        }

        // LSTs and yield-bearing tokens
        for (const t of vaultTokens) {
            const cat = classifyToken(t.mint, t.symbol);
            if (cat !== "YIELD_BEARING") continue;
            if (t.mint === NATIVE_STAKING_MINT) continue; // already handled above

            const meta = YIELD_MINTS[t.mint];
            const rate = yieldRates[t.mint];
            const apy = rate?.apy ?? meta?.fallbackApy ?? 0;
            const val = t.value || 0;

            items.push({
                name: t.symbol || "LST",
                protocol: meta?.protocol || rate?.protocol || "DeFi",
                value: val,
                amount: t.amount || 0,
                symbol: t.symbol || "SPL",
                apy,
                apySource: rate?.source || "fallback",
                monthlyYield: (val * apy / 100) / 12,
                type: "lst",
            });
        }

        // Also include totalStakedSol as a fallback if stakeAccounts is empty but totalStakedSol > 0
        if (items.length === 0 && totalStakedSol > 0 && resolvedSolPrice > 0) {
            const rate = yieldRates[NATIVE_STAKING_MINT];
            const apy = rate?.apy ?? YIELD_MINTS[NATIVE_STAKING_MINT]?.fallbackApy ?? 6.5;
            const usdValue = totalStakedSol * resolvedSolPrice;
            items.push({
                name: "Native Staked SOL",
                protocol: "Native Staking",
                value: usdValue,
                amount: totalStakedSol,
                symbol: "SOL",
                apy,
                apySource: rate?.source || "fallback",
                monthlyYield: (usdValue * apy / 100) / 12,
                type: "native_stake",
            });
        }

        return items.sort((a, b) => b.value - a.value);
    }, [vaultTokens, stakeAccounts, yieldRates, solPrice, totalStakedSol]);

    // Simulated yield override from foresight variables
    const simYieldApy = useMemo(() => {
        if (!simActive || !sim.result?.metadata?.variables) return null;
        const yieldVar = sim.result.metadata.variables.find((v: any) => v.type === "yield_apy");
        return yieldVar ? yieldVar.value * 100 : null; // convert decimal to %
    }, [simActive, sim.result]);

    // Summary stats
    const totalTvl = positions.reduce((s, p) => s + p.value, 0);
    const totalMonthlyYield = positions.reduce((s, p) => s + p.monthlyYield, 0);
    const weightedApy = totalTvl > 0
        ? positions.reduce((s, p) => s + p.value * p.apy, 0) / totalTvl
        : 0;

    // Validator distribution for pie chart
    const validatorData = useMemo(() => {
        return positions
            .filter(p => p.type === "native_stake")
            .map(p => ({ name: p.name, value: Math.round(p.value) }));
    }, [positions]);


    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">DeFi Positions</span>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Layers size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault to track DeFi positions</p>
                </div>
            </div>
        );
    }

    const displayApy = simYieldApy != null ? simYieldApy : weightedApy;
    const displayMonthly = simYieldApy != null ? (totalTvl * simYieldApy / 100) / 12 : totalMonthlyYield;

    return (
        <div className={`rounded-2xl bg-card border p-6 backdrop-blur-xl shadow-sm flex flex-col ${simActive ? "border-orange-500/30" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-4">
                <Layers size={14} className={simActive ? "text-orange-500" : "text-primary"} />
                <span className={`text-[10px] uppercase tracking-widest font-semibold ${simActive ? "text-orange-500" : "text-muted-foreground"}`}>
                    {simActive ? "Projected Positions" : "DeFi Positions"}
                </span>
                {loading && <Loader2 size={10} className="animate-spin text-primary" />}
                {simActive && <Logo size={10} fillColor="#f97316" />}
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-muted/30 border border-border text-center">
                    <span className="text-[8px] text-muted-foreground uppercase font-black block">Total TVL</span>
                    <span className="text-[12px] font-bold text-foreground">${totalTvl >= 1000 ? `${(totalTvl / 1000).toFixed(1)}K` : totalTvl.toFixed(0)}</span>
                </div>
                <div className={`p-2 rounded-lg border text-center ${simActive && simYieldApy != null ? "bg-orange-500/5 border-orange-500/20" : "bg-muted/30 border-border"}`}>
                    <span className="text-[8px] text-muted-foreground uppercase font-black block">{simActive && simYieldApy != null ? "Sim APY" : "Avg APY"}</span>
                    <span className={`text-[12px] font-bold ${simActive && simYieldApy != null ? "text-orange-500" : "text-primary"}`}>{displayApy.toFixed(1)}%</span>
                </div>
                <div className={`p-2 rounded-lg border text-center ${simActive && simYieldApy != null ? "bg-orange-500/5 border-orange-500/20" : "bg-muted/30 border-border"}`}>
                    <span className="text-[8px] text-muted-foreground uppercase font-black block">Monthly</span>
                    <span className={`text-[12px] font-bold ${simActive && simYieldApy != null ? "text-orange-500" : "text-primary"}`}>+${displayMonthly.toFixed(0)}</span>
                </div>
            </div>

            {/* Position Cards */}
            <div className="space-y-2 overflow-y-auto flex-1 max-h-[180px] scrollbar-thin">
                {positions.length === 0 ? (
                    <p className="text-center text-[10px] text-muted-foreground/60 py-4">No yield-bearing positions detected</p>
                ) : (
                    positions.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border hover:border-primary/20 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                    p.type === "native_stake" ? "bg-blue-500/10 text-blue-500"
                                        : p.type === "lst" ? "bg-primary/10 text-primary"
                                            : "bg-muted text-muted-foreground"
                                }`}>
                                    {p.type === "native_stake" ? <Shield size={10} /> : <TrendingUp size={10} />}
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-foreground block truncate">{p.name}</span>
                                    <span className="text-[8px] text-muted-foreground">{p.protocol}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-[10px] font-bold text-foreground block">${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <span className={`text-[8px] font-mono ${p.apySource === "live" ? "text-primary" : "text-muted-foreground"}`}>
                                    {p.apy.toFixed(1)}% APY {p.apySource === "live" ? "●" : "○"}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Validator Distribution Mini Chart */}
            {validatorData.length > 1 && (
                <div className="mt-4 pt-3 border-t border-border">
                    <span className="text-[8px] text-muted-foreground uppercase font-black block mb-2">Validator Distribution</span>
                    <div className="h-[60px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={validatorData}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={15}
                                    outerRadius={28}
                                    strokeWidth={1}
                                    stroke="var(--dashboard-card)"
                                >
                                    {validatorData.map((_, i) => (
                                        <Cell key={i} fill={getTokenColor(`v${i}`)} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ fontSize: "9px", borderRadius: "8px", backgroundColor: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
                                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Staked"]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};
