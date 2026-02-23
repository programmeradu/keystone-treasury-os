"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Logo } from "@/components/icons";
import { Terminal, Activity, TrendingUp, Search, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { AppEventBus } from "@/lib/events";
import { toast } from "@/lib/toast-notifications";

interface FearGreedData {
    value: number;
    classification: string;
    timestamp: string;
}

export const MarketSentiment = () => {
    const { vaultTokens, vaultValue, vaultChange24h, activeVault } = useVault();
    const sim = useSimulationStore();
    const simActive = sim.active && !!sim.result;
    const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
    const [fgLoading, setFgLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiObservation, setAiObservation] = useState<string | null>(null);

    // Fetch real Fear & Greed Index
    useEffect(() => {
        let cancelled = false;
        setFgLoading(true);
        (async () => {
            try {
                const res = await fetch("https://api.alternative.me/fng/?limit=1&format=json");
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data.data?.[0]) {
                    setFearGreed({
                        value: parseInt(data.data[0].value),
                        classification: data.data[0].value_classification,
                        timestamp: data.data[0].timestamp,
                    });
                }
            } catch { /* fallback to derived */ }
            finally { if (!cancelled) setFgLoading(false); }
        })();
        return () => { cancelled = true; };
    }, []);

    // Fetch LLM-powered tactical suggestion
    const fetchAiInsight = useCallback(async () => {
        if (!activeVault || vaultTokens.length === 0) return;

        setAiLoading(true);
        try {
            const portfolioSummary = vaultTokens
                .filter(t => (t.value || 0) > 0)
                .slice(0, 10)
                .map(t => `${t.symbol}: $${(t.value || 0).toFixed(0)} (${((t.value || 0) / (vaultValue || 1) * 100).toFixed(1)}%)`)
                .join(", ");

            const fgText = fearGreed
                ? `Fear & Greed Index: ${fearGreed.value}/100 (${fearGreed.classification})`
                : "Fear & Greed unavailable";

            const prompt = `You are a treasury intelligence analyst for a Solana DAO/treasury. Analyze the current portfolio state and provide: 1) A brief market observation (2 sentences), 2) A tactical suggestion (2-3 sentences).

Portfolio: ${portfolioSummary}
Total Value: $${(vaultValue || 0).toFixed(0)}
24h Change: ${(vaultChange24h || 0).toFixed(2)}%
${fgText}
Assets: ${vaultTokens.length}

Response format: JSON { "observation": "...", "suggestion": "..." }`;

            const res = await fetch("/api/ai/parse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            if (res.ok) {
                const data = await res.json();
                // Try to parse structured response
                const text = data.result || data.text || data.content || "";
                try {
                    const parsed = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
                    if (parsed.observation) setAiObservation(parsed.observation);
                    if (parsed.suggestion) setAiSuggestion(parsed.suggestion);
                } catch {
                    // If not JSON, use the raw text as suggestion
                    if (text.length > 20) setAiSuggestion(text.substring(0, 300));
                }
            }
        } catch { /* fallback to static */ }
        finally { setAiLoading(false); }
    }, [activeVault, vaultTokens, vaultValue, vaultChange24h, fearGreed]);

    // Auto-fetch AI insight when vault data is available
    useEffect(() => {
        if (activeVault && vaultTokens.length > 0 && !aiSuggestion) {
            const timeout = setTimeout(fetchAiInsight, 1500); // Small delay to let F&G load first
            return () => clearTimeout(timeout);
        }
    }, [activeVault, vaultTokens.length > 0, fearGreed]); // eslint-disable-line react-hooks/exhaustive-deps

    const metrics = useMemo(() => {
        const change = vaultChange24h || 0;
        const absChange = Math.abs(change);

        // Real Fear & Greed
        const sentimentScore = fearGreed?.value ?? Math.min(100, Math.max(0, 50 + change * 5));
        const sentimentLabel = fearGreed?.classification ??
            (sentimentScore > 70 ? "Greed" : sentimentScore > 55 ? "Optimism" : sentimentScore > 45 ? "Neutral" : sentimentScore > 30 ? "Fear" : "Panic");

        // Volatility from 24h change
        const volLabel = absChange > 8 ? "Extreme" : absChange > 4 ? "High" : absChange > 1.5 ? "Moderate" : "Low";
        const volColor = absChange > 8 ? "text-destructive" : absChange > 4 ? "text-orange-500" : "text-primary";

        // Allocation
        const totalVal = vaultValue || 0;
        const topPct = totalVal > 0 && vaultTokens.length > 0 ? ((vaultTokens[0]?.value || 0) / totalVal * 100) : 0;
        const flowLabel = vaultTokens.length > 5 ? "Diversified" : vaultTokens.length > 2 ? "Balanced" : vaultTokens.length > 0 ? "Concentrated" : "No Data";

        return { sentimentScore: Math.round(sentimentScore), sentimentLabel, volLabel, volColor, flowLabel, topPct: Math.round(topPct), change };
    }, [vaultTokens, vaultValue, vaultChange24h, fearGreed]);

    // Fallback observation (used if AI hasn't responded yet)
    const observation = useMemo(() => {
        if (aiObservation) return aiObservation;
        if (vaultTokens.length === 0) return "Connect a vault to receive market observations and tactical suggestions based on your treasury composition.";
        const change = vaultChange24h || 0;
        const topToken = vaultTokens[0]?.symbol || "top asset";
        const topPct = metrics.topPct;
        if (change > 3) return `Portfolio trending strongly positive (${change.toFixed(1)}% 24h). ${topToken} leads at ${topPct}% allocation. Consider taking partial profits on momentum.`;
        if (change < -3) return `Portfolio under pressure (${change.toFixed(1)}% 24h). ${topToken} at ${topPct}% concentration. Consider rebalancing to reduce single-asset exposure.`;
        return `Portfolio stable (${change.toFixed(1)}% 24h). ${topToken} at ${topPct}% allocation across ${vaultTokens.length} assets. Current diversification: ${metrics.flowLabel.toLowerCase()}.`;
    }, [vaultTokens, vaultChange24h, metrics, aiObservation]);

    const suggestion = useMemo(() => {
        if (aiSuggestion) return aiSuggestion;
        if (vaultTokens.length === 0) return "Sync your vault address above to unlock treasury intelligence.";
        if (metrics.topPct > 70) return `High concentration risk — ${vaultTokens[0]?.symbol} at ${metrics.topPct}%. Consider rebalancing to bring below 50% for better risk distribution.`;
        if (metrics.volColor === "text-destructive") return "Extreme volatility detected. Recommend increasing stablecoin allocation and deferring new positions until conditions stabilize.";
        if (metrics.change > 5) return "Strong momentum. Consider setting trailing stop-losses to protect gains, and allocate profits to yield-bearing positions.";
        if (metrics.change < -5) return "Significant drawdown. Avoid panic selling. If fundamentals are intact, consider DCA into oversold positions.";
        return `Portfolio is well-positioned. Maintain current allocation and monitor for rebalancing opportunities when any single asset exceeds 60%.`;
    }, [vaultTokens, metrics, aiSuggestion]);

    const handleViewSources = () => {
        if (activeVault) {
            window.open(`https://solscan.io/account/${activeVault}`, "_blank");
        } else {
            toast.info("No vault connected", { description: "Sync a vault address to view on-chain data" });
        }
    };

    const handleApplyStrategy = () => {
        AppEventBus.emit("AGENT_COMMAND", { command: "apply_strategy", suggestion });
        toast.success("Strategy sent to Agent", { description: "The tactical suggestion has been forwarded to the command pipeline" });
    };

    // Sim-aware observation overlay
    const simObservation = useMemo(() => {
        if (!simActive || !sim.result) return null;
        const { deltaPercent, runwayMonths, riskFlags } = sim.result.summary;
        const months = sim.result.metadata.timeframeMonths;
        let text = `Foresight projects ${deltaPercent >= 0 ? "+" : ""}${deltaPercent.toFixed(1)}% over ${months}mo.`;
        if (runwayMonths != null) text += ` Treasury depletes in ~${runwayMonths.toFixed(1)} months.`;
        if (riskFlags.length > 0) text += ` Flags: ${riskFlags.join(", ").replace(/_/g, " ").toLowerCase()}.`;
        return text;
    }, [simActive, sim.result]);

    return (
        <div className={`h-full rounded-2xl bg-card border p-5 flex flex-col relative overflow-hidden group shadow-sm ${simActive ? "border-orange-500/30" : "border-border"}`}>
            {/* 1. Terminal Header */}
            <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={`absolute inset-0 blur-[15px] opacity-20 ${simActive ? "bg-orange-500" : "bg-primary"}`} />
                        <Logo size={28} fillColor={simActive ? "#f97316" : "var(--dashboard-accent)"} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">Keystone Intelligence</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${simActive ? "bg-orange-500" : "bg-primary"}`} />
                            <span className="text-[9px] text-muted-foreground font-mono">
                                {simActive ? "SIMULATION MODE" : vaultTokens.length > 0 ? `LIVE // ${vaultTokens.length} ASSETS` : "AWAITING VAULT"}
                                {fearGreed && ` // F&G: ${fearGreed.value}`}
                            </span>
                        </div>
                    </div>
                </div>
                {activeVault && (
                    <button
                        onClick={fetchAiInsight}
                        disabled={aiLoading}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                        title="Refresh AI analysis"
                    >
                        {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    </button>
                )}
            </div>

            {/* 2. Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
                <MetricBox
                    label="Fear & Greed"
                    value={fgLoading ? "..." : vaultTokens.length > 0 || fearGreed ? metrics.sentimentScore : "—"}
                    sub={fearGreed ? `${fearGreed.classification}` : (vaultTokens.length > 0 ? metrics.sentimentLabel : "No Data")}
                    color={metrics.sentimentScore > 60 ? "text-primary" : metrics.sentimentScore > 40 ? "text-orange-500" : "text-destructive"}
                    source={fearGreed ? "alternative.me" : "derived"}
                />
                <MetricBox
                    label="Volatility"
                    value={vaultTokens.length > 0 ? metrics.volLabel : "—"}
                    sub={vaultTokens.length > 0 ? `${Math.abs(vaultChange24h || 0).toFixed(1)}% 24h` : "No Data"}
                    color={metrics.volColor}
                />
                <MetricBox
                    label="Allocation"
                    value={vaultTokens.length > 0 ? metrics.flowLabel : "—"}
                    sub={vaultTokens.length > 0 ? `Top: ${metrics.topPct}%` : "No Data"}
                    color="text-primary"
                />
            </div>

            {/* 3. The Insight (Structured) */}
            <div className="flex-1 bg-muted/30 rounded-xl p-5 border border-border font-mono text-xs relative overflow-hidden shadow-inner">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />

                <div className="space-y-4 relative z-10">
                    <div>
                        <span className="text-muted-foreground uppercase font-bold text-[9px] mb-1 block flex items-center gap-1">
                            <Search size={10} /> {simActive ? "Foresight Analysis" : "Market Observation"}
                            {simActive && <span className="text-orange-500 text-[7px] ml-1">SIM</span>}
                            {!simActive && aiObservation && <span className="text-primary text-[7px] ml-1">AI-POWERED</span>}
                        </span>
                        <p className="text-foreground/90 leading-relaxed font-bold">{simActive && simObservation ? simObservation : observation}</p>
                    </div>

                    <div className="w-full h-px bg-border" />

                    <div>
                        <span className="text-primary uppercase font-bold text-[9px] mb-1 block flex items-center gap-1">
                            <Terminal size={10} /> Tactical Suggestion
                            {aiSuggestion && <span className="text-primary text-[7px] ml-1">AI-POWERED</span>}
                            {aiLoading && <Loader2 size={8} className="animate-spin ml-1" />}
                        </span>
                        <p className="text-foreground/90 leading-relaxed font-bold">{suggestion}</p>
                    </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Activity size={100} />
                </div>
            </div>

            {/* 4. Action Footer */}
            <div className="mt-4 flex items-center justify-between gap-3">
                <button
                    onClick={handleViewSources}
                    className="flex-1 py-1.5 rounded-md bg-muted border border-border hover:bg-muted/80 text-[9px] text-muted-foreground font-black uppercase transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                    <ExternalLink size={10} />
                    View Sources
                </button>
                <button
                    onClick={handleApplyStrategy}
                    className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-[9px] font-black uppercase transition-colors inline-flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 text-center"
                >
                    <TrendingUp size={10} />
                    Apply Strategy
                </button>
            </div>
        </div>
    );
};

const MetricBox = ({ label, value, sub, color, source }: any) => (
    <div className="bg-muted/30 p-1.5 sm:p-2 rounded-lg border border-border flex flex-col items-center justify-center text-center shadow-inner min-w-0 overflow-hidden">
        <span className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-black mb-0.5">{label}</span>
        <span className={`text-[10px] sm:text-xs lg:text-sm font-black tracking-tight leading-none ${color}`}>{value}</span>
        <span className="text-[7px] sm:text-[8px] text-muted-foreground/60 uppercase font-black mt-0.5">{sub}</span>
        {source && <span className="text-[6px] text-muted-foreground/40 font-mono mt-0.5">{source}</span>}
    </div>
);
