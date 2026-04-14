"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Send, X, Maximize2, Minimize2, ChevronDown, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ForesightPreview } from "./ForesightPreview";
import { generateForesight, type ForesightScenario, type PortfolioSnapshot } from "@/lib/foresight/foresight-agent";
import { useVault } from "@/lib/contexts/VaultContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Preset Prompts ─────────────────────────────────────────────────

const PRESET_PROMPTS = [
    "What if SOL drops 50% over 12 months?",
    "Runway with $20k/month burn rate?",
    "SOL drops 30% + $15k/month burn + 8% APY yield",
    "What if ETH rises 100% over 6 months?",
    "Impact of a 500 SOL buyback if price slips 20%",
];

// ─── Component ──────────────────────────────────────────────────────

export function ForesightPanel() {
    const { vaultTokens, vaultValue } = useVault();
    const [prompt, setPrompt] = useState("");
    const [scenario, setScenario] = useState<ForesightScenario | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [history, setHistory] = useState<ForesightScenario[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showPresets, setShowPresets] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Build portfolio snapshot from vault context
    const portfolio: PortfolioSnapshot[] = vaultTokens.length > 0
        ? vaultTokens.map(t => ({
            symbol: t.symbol || "SPL",
            amount: t.amount || 0,
            price: t.price || 0,
        }))
        : [
            // Fallback demo portfolio if no vault synced
            { symbol: "SOL", amount: 124.5, price: 175.00 },
            { symbol: "USDC", amount: 54000, price: 1.00 },
            { symbol: "JUP", amount: 850, price: 1.12 },
            { symbol: "BONK", amount: 15000000, price: 0.000024 },
        ];

    const handleGenerate = useCallback((inputPrompt?: string) => {
        const p = (inputPrompt || prompt).trim();
        if (!p) {
            toast.error("Type a What-If scenario to generate a foresight.");
            return;
        }

        try {
            const result = generateForesight(p, portfolio);
            setScenario(result);
            setHistory(prev => [result, ...prev].slice(0, 10));
            setIsExpanded(true);
            setShowPresets(false);
            toast.success("Foresight generated", {
                description: `${result.variables.length} variables, ${result.timeframeMonths}mo projection`,
            });
        } catch (err: any) {
            console.error("[Foresight] Generation failed:", err);
            toast.error("Failed to generate foresight: " + err.message);
        }
    }, [prompt, portfolio]);

    const handlePreset = (preset: string) => {
        setPrompt(preset);
        handleGenerate(preset);
    };

    const handleClear = () => {
        setScenario(null);
        setPrompt("");
        setIsExpanded(false);
    };

    const handleSimResult = useCallback((result: any) => {
        if (result?.summary?.riskFlags?.length > 0) {
            toast.warning("Risk flags detected", {
                description: result.summary.riskFlags.join(", "),
            });
        }
    }, []);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Foresight Engine</h3>
                </div>
                <div className="flex items-center gap-1">
                    {history.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setShowHistory(!showHistory)}
                        >
                            <History size={12} className="text-muted-foreground" />
                        </Button>
                    )}
                    {scenario && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleClear}
                            >
                                <X size={12} className="text-muted-foreground" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Prompt Input */}
            <div className="px-4 py-3 border-b border-border bg-background/50">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            ref={inputRef}
                            placeholder='Ask: "What if SOL drops 50%?"'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleGenerate();
                            }}
                            onFocus={() => !scenario && setShowPresets(true)}
                            className="h-9 text-xs font-mono bg-muted/40 border-border pr-20"
                        />
                        {!prompt && (
                            <button
                                onClick={() => setShowPresets(!showPresets)}
                                className="absolute right-12 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Presets <ChevronDown size={10} className="inline" />
                            </button>
                        )}
                    </div>
                    <Button
                        onClick={() => handleGenerate()}
                        size="sm"
                        className="h-9 px-4 gap-2 text-[10px] font-black uppercase"
                    >
                        <Sparkles size={12} />
                        Generate
                    </Button>
                </div>

                {/* Preset Prompts */}
                <AnimatePresence>
                    {showPresets && !scenario && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex flex-wrap gap-1.5 pt-3">
                                {PRESET_PROMPTS.map((p, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handlePreset(p)}
                                        className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* History Dropdown */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-border"
                    >
                        <div className="px-4 py-2 bg-muted/10 max-h-[150px] overflow-y-auto scrollbar-thin">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Recent Foresights</span>
                                <button
                                    onClick={() => { setHistory([]); setShowHistory(false); }}
                                    className="text-[9px] font-bold uppercase text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                                >
                                    <Trash2 size={10} /> Clear
                                </button>
                            </div>
                            {history.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setScenario(h);
                                        setPrompt(h.description);
                                        setIsExpanded(true);
                                        setShowHistory(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors flex items-center gap-3 group"
                                >
                                    <Sparkles size={10} className="text-primary shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-foreground truncate">{h.title}</div>
                                        <div className="text-[9px] text-muted-foreground truncate">{h.variables.length} vars \u2022 {h.timeframeMonths}mo</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Foresight Preview */}
            <div className={`flex-1 relative transition-all ${isExpanded ? "min-h-[400px]" : scenario ? "min-h-[300px]" : "min-h-[100px]"}`}>
                {scenario ? (
                    <ForesightPreview
                        code={scenario.generatedCode}
                        portfolio={portfolio}
                        onSimulation={handleSimResult}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                            <Sparkles size={20} className="text-primary" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground mb-1">Generative Foresight</h4>
                        <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
                            Type a What-If scenario and the Architect Agent will generate an interactive simulation dashboard.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[9px] text-muted-foreground/50 uppercase font-bold tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
                            Powered by dreyv Simulation Engine
                        </div>
                    </div>
                )}
            </div>

            {/* Scenario Meta Footer */}
            {scenario && (
                <div className="px-4 py-2 border-t border-border bg-muted/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {scenario.variables.length} variable{scenario.variables.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50">|</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {scenario.timeframeMonths}mo horizon
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50">|</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary">
                            {vaultTokens.length > 0 ? "LIVE VAULT" : "DEMO PORTFOLIO"}
                        </span>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground/30">EPHEMERAL // NOT SAVED</span>
                </div>
            )}
        </div>
    );
}
