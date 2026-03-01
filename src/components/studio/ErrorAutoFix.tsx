"use client";

/**
 * ErrorAutoFix — Runtime error → 1-click AI fix loop (Ouroboros Integration).
 *
 * When a runtime error is caught in the LivePreview, this component captures it,
 * sends it to the AI Architect with the current code context, and presents a
 * suggested fix as a diff preview that can be applied with one click.
 *
 * [Phase 7] — Error Auto-Fix Loop
 */

import React, { useState, useCallback } from "react";
import { AlertTriangle, Sparkles, Loader2, Check, X, RotateCcw } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface ErrorAutoFixProps {
    /** The runtime error message from LivePreview */
    error: string;
    /** The current code that produced the error */
    code: string;
    /** Console logs for additional context */
    logs?: string[];
    /** Callback when user accepts the fix */
    onApplyFix: (fixedCode: string) => void;
    /** Callback to dismiss */
    onDismiss: () => void;
    /** AI endpoint for fix generation */
    aiEndpoint?: string;
}

interface FixState {
    phase: "idle" | "analyzing" | "ready" | "error";
    fixedCode: string | null;
    explanation: string | null;
    fixError: string | null;
}

// ─── Component ──────────────────────────────────────────────────────

export function ErrorAutoFix({
    error,
    code,
    logs = [],
    onApplyFix,
    onDismiss,
    aiEndpoint = "/api/ai/auto-fix",
}: ErrorAutoFixProps) {
    const [state, setState] = useState<FixState>({
        phase: "idle",
        fixedCode: null,
        explanation: null,
        fixError: null,
    });

    const requestFix = useCallback(async () => {
        setState({ phase: "analyzing", fixedCode: null, explanation: null, fixError: null });

        try {
            const res = await fetch(aiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error,
                    code,
                    logs: logs.slice(-20),
                    sdkHooks: [
                        "useVault", "useTurnkey", "useFetch", "AppEventBus",
                        "useEncryptedSecret", "useACEReport", "useAgentHandoff",
                        "useMCPClient", "useMCPServer", "useSIWS", "useJupiterSwap",
                        "useImpactReport", "useTaxForensics", "useYieldOptimizer",
                        "useGaslessTx",
                    ],
                }),
            });

            if (!res.ok) throw new Error(`AI returned ${res.status}`);

            const data = (await res.json()) as { fixedCode: string; explanation: string };
            setState({
                phase: "ready",
                fixedCode: data.fixedCode,
                explanation: data.explanation,
                fixError: null,
            });
        } catch (err) {
            setState({
                phase: "error",
                fixedCode: null,
                explanation: null,
                fixError: err instanceof Error ? err.message : "Fix generation failed",
            });
        }
    }, [error, code, logs, aiEndpoint]);

    return (
        <div className="bg-zinc-900 border border-red-500/20 rounded-xl overflow-hidden">
            {/* Error Header */}
            <div className="flex items-start gap-3 p-4 bg-red-500/5 border-b border-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-red-400 mb-1">Runtime Error</h3>
                    <p className="text-xs text-red-300/80 font-mono break-words leading-relaxed">
                        {error}
                    </p>
                </div>
                <button onClick={onDismiss} className="p-1 hover:bg-zinc-800 rounded transition-colors shrink-0">
                    <X className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* AI Fix Section */}
            <div className="p-4 space-y-3">
                {state.phase === "idle" && (
                    <button
                        onClick={requestFix}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-colors"
                    >
                        <Sparkles className="w-4 h-4" />
                        Auto-Fix with AI Architect
                    </button>
                )}

                {state.phase === "analyzing" && (
                    <div className="flex items-center justify-center gap-2 py-4 text-emerald-400 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing error and generating fix…
                    </div>
                )}

                {state.phase === "ready" && state.fixedCode && (
                    <>
                        {state.explanation && (
                            <div className="bg-zinc-800/50 rounded-lg p-3">
                                <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
                                    AI Explanation
                                </h4>
                                <p className="text-xs text-zinc-300 leading-relaxed">{state.explanation}</p>
                            </div>
                        )}

                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg overflow-hidden">
                            <div className="px-3 py-1.5 bg-emerald-500/10 text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                                Suggested Fix
                            </div>
                            <pre className="p-3 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                                {state.fixedCode}
                            </pre>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onApplyFix(state.fixedCode!)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Apply Fix
                            </button>
                            <button
                                onClick={requestFix}
                                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 text-sm transition-colors"
                                title="Regenerate"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onDismiss}
                                className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                            >
                                Dismiss
                            </button>
                        </div>
                    </>
                )}

                {state.phase === "error" && (
                    <div className="space-y-2">
                        <p className="text-xs text-amber-400">{state.fixError}</p>
                        <button
                            onClick={requestFix}
                            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 text-sm transition-colors"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
