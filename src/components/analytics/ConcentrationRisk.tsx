"use client";

import React, { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useVault } from "@/lib/contexts/VaultContext";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import { getTokenColor } from "@/lib/token-colors";
import { classifyToken } from "@/lib/yield-registry";

// ─── Stablecoin detection ────────────────────────────────────────────
const STABLECOINS = new Set(["USDC", "USDT", "BUSD", "DAI", "TUSD", "USDP", "FRAX", "LUSD", "PYUSD", "GUSD"]);

interface RiskFactor {
    name: string;
    score: number; // 0-10 (0 = no risk, 10 = critical)
    label: string;
    description: string;
}

export interface RiskResult {
    overallScore: number;
    overallLabel: string;
    factors: RiskFactor[];
}

export function computeMultiFactorRisk(
    tokens: any[],
    stakeAccounts?: any[],
    change24h?: number | null,
): RiskResult {
    const totalValue = tokens.reduce((s: number, t: any) => s + (t.value || 0), 0);
    const factors: RiskFactor[] = [];

    // 1. Asset Concentration
    const topPct = totalValue > 0 && tokens.length > 0 ? ((tokens[0]?.value || 0) / totalValue) * 100 : 0;
    const concScore = topPct > 80 ? 9 : topPct > 60 ? 7 : topPct > 40 ? 4 : topPct > 20 ? 2 : 1;
    factors.push({
        name: "Asset Concentration",
        score: concScore,
        label: concScore > 6 ? "HIGH" : concScore > 3 ? "MODERATE" : "LOW",
        description: `Top asset: ${topPct.toFixed(0)}% of portfolio`,
    });

    // 2. Stablecoin Ratio
    const stableValue = tokens.filter((t: any) => STABLECOINS.has((t.symbol || "").toUpperCase())).reduce((s: number, t: any) => s + (t.value || 0), 0);
    const stablePct = totalValue > 0 ? (stableValue / totalValue) * 100 : 0;
    const stableScore = stablePct > 30 ? 1 : stablePct > 15 ? 3 : stablePct > 5 ? 5 : 8;
    factors.push({
        name: "Stablecoin Buffer",
        score: stableScore,
        label: stableScore > 6 ? "THIN" : stableScore > 3 ? "MODERATE" : "STRONG",
        description: `${stablePct.toFixed(1)}% in stablecoins`,
    });

    // 3. Volatility Exposure
    const absChange = Math.abs(change24h || 0);
    const volScore = absChange > 10 ? 9 : absChange > 5 ? 6 : absChange > 2 ? 3 : 1;
    factors.push({
        name: "24h Volatility",
        score: volScore,
        label: volScore > 6 ? "HIGH" : volScore > 3 ? "MODERATE" : "LOW",
        description: `${absChange.toFixed(1)}% 24h change`,
    });

    // 4. Diversification
    const activeTokens = tokens.filter((t: any) => (t.value || 0) > 0).length;
    const divScore = activeTokens >= 5 ? 1 : activeTokens >= 3 ? 3 : activeTokens >= 2 ? 5 : 8;
    factors.push({
        name: "Diversification",
        score: divScore,
        label: divScore > 6 ? "POOR" : divScore > 3 ? "MODERATE" : "GOOD",
        description: `${activeTokens} active positions`,
    });

    // 5. Validator Diversification (if staking)
    if (stakeAccounts && stakeAccounts.length > 0) {
        const uniqueValidators = new Set(stakeAccounts.map((sa: any) => sa.validator)).size;
        const valScore = uniqueValidators >= 4 ? 1 : uniqueValidators >= 2 ? 3 : 6;
        factors.push({
            name: "Validator Spread",
            score: valScore,
            label: valScore > 5 ? "CENTRALIZED" : valScore > 2 ? "MODERATE" : "DISTRIBUTED",
            description: `${uniqueValidators} unique validator(s)`,
        });
    }

    // 6. Liquidity Risk
    const stakedValue = tokens.filter((t: any) => t.isStaked || classifyToken(t.mint, t.symbol) === "YIELD_BEARING").reduce((s: number, t: any) => s + (t.value || 0), 0);
    const illiquidPct = totalValue > 0 ? (stakedValue / totalValue) * 100 : 0;
    const liqScore = illiquidPct > 80 ? 7 : illiquidPct > 50 ? 5 : illiquidPct > 20 ? 2 : 1;
    factors.push({
        name: "Liquidity Risk",
        score: liqScore,
        label: liqScore > 5 ? "LOCKED" : liqScore > 3 ? "MODERATE" : "LIQUID",
        description: `${illiquidPct.toFixed(0)}% in locked/staked positions`,
    });

    // Overall score: weighted average
    const weights = [0.25, 0.15, 0.2, 0.15, 0.1, 0.15];
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < factors.length; i++) {
        const w = weights[i] || 0.1;
        weightedSum += factors[i].score * w;
        weightSum += w;
    }
    const overallScore = Math.round(weightedSum / weightSum);
    const overallLabel = overallScore > 7 ? "CRITICAL" : overallScore > 5 ? "HIGH" : overallScore > 3 ? "MODERATE" : "LOW";

    return { overallScore, overallLabel, factors };
}

// Risk-level colors (explicit hex for treemap rendering)
const RISK_COLORS = {
    low: "#36e27b",    // green accent
    moderate: "#f59e0b", // amber
    high: "#ef4444",     // red
};

// Custom treemap content renderer
const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, value, score, color: tokenColor } = props;
    if (width < 20 || height < 15) return null;

    const riskColor = score > 6 ? RISK_COLORS.high : score > 3 ? RISK_COLORS.moderate : RISK_COLORS.low;
    // Use token color for the fill, risk color for the border
    const fillColor = tokenColor || riskColor;

    return (
        <g>
            <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={fillColor} fillOpacity={0.15} stroke={riskColor} strokeWidth={1.5} strokeOpacity={0.6} rx={6} />
            {width > 50 && height > 30 && (
                <>
                    <text x={x + 8} y={y + 16} fill="#e2e8f0" fontSize={11} fontWeight={800}>
                        {name}
                    </text>
                    <text x={x + 8} y={y + 28} fill="#94a3b8" fontSize={9}>
                        ${typeof value === "number" ? value.toLocaleString() : value}
                    </text>
                </>
            )}
            {width > 30 && width <= 50 && height > 20 && (
                <text x={x + 4} y={y + 14} fill="#e2e8f0" fontSize={9} fontWeight={700}>
                    {name}
                </text>
            )}
        </g>
    );
};

export const ConcentrationRisk = () => {
    const { activeVault, vaultTokens, stakeAccounts, vaultChange24h } = useVault();
    const sim = useSimulationStore();

    const risk = useMemo((): RiskResult => {
        if (!activeVault || vaultTokens.length === 0) {
            return { overallScore: 0, overallLabel: "N/A", factors: [] };
        }
        return computeMultiFactorRisk(vaultTokens, stakeAccounts, vaultChange24h);
    }, [activeVault, vaultTokens, stakeAccounts, vaultChange24h]);

    // Treemap data
    const treemapData = useMemo(() => {
        if (vaultTokens.length === 0) return [];
        const totalValue = vaultTokens.reduce((s, t) => s + (t.value || 0), 0);
        return vaultTokens
            .filter(t => (t.value || 0) > 0)
            .map(t => {
                const pct = totalValue > 0 ? ((t.value || 0) / totalValue) * 100 : 0;
                const isStable = STABLECOINS.has((t.symbol || "").toUpperCase());
                const score = pct > 60 ? 8 : pct > 40 ? 6 : pct > 20 ? 4 : isStable ? 1 : 3;
                return {
                    name: t.symbol || "SPL",
                    value: Math.round(t.value || 0),
                    score,
                    pct: pct.toFixed(1),
                    color: getTokenColor(t.symbol || "SPL"),
                };
            });
    }, [vaultTokens]);

    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Concentration Risk</span>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ShieldAlert size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault for risk analysis</p>
                </div>
            </div>
        );
    }

    const scoreColor = risk.overallScore > 7 ? "text-destructive" : risk.overallScore > 5 ? "text-orange-500" : risk.overallScore > 3 ? "text-orange-400" : "text-primary";
    const ScoreIcon = risk.overallScore > 5 ? AlertTriangle : risk.overallScore > 3 ? ShieldAlert : CheckCircle;

    return (
        <div className={`rounded-2xl bg-card border p-6 backdrop-blur-xl shadow-sm ${risk.overallScore > 6 ? "border-destructive/30" : "border-border"}`}>
            <div className="flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className={scoreColor} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Concentration Risk</span>
            </div>

            {/* Treemap */}
            {treemapData.length > 0 && (
                <div className="h-[120px] w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                            data={treemapData}
                            dataKey="value"
                            content={<CustomTreemapContent />}
                        >
                            <Tooltip
                                contentStyle={{ fontSize: "9px", borderRadius: "8px", backgroundColor: "var(--dashboard-card)", border: "1px solid var(--dashboard-border)" }}
                                formatter={(v: number, _: any, props: any) => [`$${v.toLocaleString()} (${props.payload?.pct}%)`, props.payload?.name]}
                            />
                        </Treemap>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Risk Factors Table */}
            <div className="space-y-1.5">
                {risk.factors.map(f => (
                    <div key={f.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                f.score > 6 ? "bg-destructive" : f.score > 3 ? "bg-orange-500" : "bg-primary"
                            }`} />
                            <span className="text-[9px] text-muted-foreground truncate">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[8px] font-black uppercase ${
                                f.score > 6 ? "text-destructive" : f.score > 3 ? "text-orange-500" : "text-primary"
                            }`}>
                                {f.label}
                            </span>
                            <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${f.score > 6 ? "bg-destructive" : f.score > 3 ? "bg-orange-500" : "bg-primary"}`}
                                    style={{ width: `${f.score * 10}%` }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Overall Score */}
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ScoreIcon size={12} className={scoreColor} />
                    <span className="text-[9px] font-black uppercase text-muted-foreground">Overall Risk</span>
                </div>
                <span className={`text-sm font-black ${scoreColor}`}>
                    {risk.overallScore}/10 {risk.overallLabel}
                </span>
            </div>
        </div>
    );
};
