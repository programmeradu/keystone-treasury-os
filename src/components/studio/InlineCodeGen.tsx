"use client";

/**
 * InlineCodeGen — Cursor-like Ctrl+K inline code generation overlay.
 *
 * Activated via Ctrl+K (or Cmd+K on Mac) when focused in the Monaco editor.
 * Shows a floating prompt input at the cursor position, calls the AI architect,
 * and streams the generated code as a diff preview before insertion.
 *
 * [Phase 5] — Inline AI Code Generation
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Loader2, Check, X, ChevronRight } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface InlineCodeGenProps {
    /** Monaco editor instance ref */
    editorRef: React.MutableRefObject<any>;
    /** Current file content */
    code: string;
    /** Callback when AI generates code to insert */
    onInsert: (newCode: string) => void;
    /** Optional: custom AI endpoint */
    aiEndpoint?: string;
}

interface InlineState {
    isOpen: boolean;
    prompt: string;
    loading: boolean;
    generatedCode: string | null;
    cursorLine: number;
    cursorCol: number;
    selectedText: string;
    error: string | null;
}

// ─── Preset Prompts ─────────────────────────────────────────────────

const PRESETS = [
    { label: "Add useVault hook", prompt: "Add useVault hook to display wallet balances" },
    { label: "Add Jupiter swap", prompt: "Add useJupiterSwap with quote and swap functionality" },
    { label: "Add error handling", prompt: "Wrap this code with proper error handling and loading states" },
    { label: "Add Tailwind styling", prompt: "Add professional dark-mode Tailwind CSS styling to this component" },
];

// ─── Component ──────────────────────────────────────────────────────

export function InlineCodeGen({
    editorRef,
    code,
    onInsert,
    aiEndpoint = "/api/ai/inline-gen",
}: InlineCodeGenProps) {
    const [state, setState] = useState<InlineState>({
        isOpen: false,
        prompt: "",
        loading: false,
        generatedCode: null,
        cursorLine: 0,
        cursorCol: 0,
        selectedText: "",
        error: null,
    });

    const inputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    // ─── Register Ctrl+K keybinding on Monaco ────────────
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        // Register Ctrl+K / Cmd+K
        const disposable = editor.addAction({
            id: "keystone.inlineCodeGen",
            label: "Keystone: Inline Code Generation",
            keybindings: [
                // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyK
                2048 | 41, // CtrlCmd + K
            ],
            run: () => {
                const position = editor.getPosition();
                const selection = editor.getSelection();
                const model = editor.getModel();

                let selectedText = "";
                if (selection && !selection.isEmpty()) {
                    selectedText = model?.getValueInRange(selection) ?? "";
                }

                setState((prev) => ({
                    ...prev,
                    isOpen: true,
                    prompt: "",
                    loading: false,
                    generatedCode: null,
                    error: null,
                    cursorLine: position?.lineNumber ?? 0,
                    cursorCol: position?.column ?? 0,
                    selectedText,
                }));

                // Focus the input after state updates
                setTimeout(() => inputRef.current?.focus(), 50);
            },
        });

        return () => disposable.dispose();
    }, [editorRef]);

    // ─── Generate Code ───────────────────────────────────
    const handleGenerate = useCallback(async () => {
        if (!state.prompt.trim()) return;

        setState((prev) => ({ ...prev, loading: true, error: null, generatedCode: null }));

        try {
            const contextLines = code.split("\n");
            const surroundingContext = contextLines
                .slice(Math.max(0, state.cursorLine - 10), state.cursorLine + 10)
                .join("\n");

            const res = await fetch(aiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: state.prompt,
                    context: surroundingContext,
                    selectedText: state.selectedText,
                    cursorLine: state.cursorLine,
                    fullCode: code,
                    sdkHooks: [
                        "useVault", "useTurnkey", "useFetch", "AppEventBus",
                        "useEncryptedSecret", "useACEReport", "useAgentHandoff",
                        "useMCPClient", "useMCPServer", "useSIWS", "useJupiterSwap",
                        "useImpactReport", "useTaxForensics", "useYieldOptimizer",
                        "useGaslessTx",
                    ],
                }),
            });

            if (!res.ok) {
                throw new Error(`AI returned ${res.status}`);
            }

            const data = (await res.json()) as { code: string };
            setState((prev) => ({ ...prev, loading: false, generatedCode: data.code }));
        } catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: err instanceof Error ? err.message : "Generation failed",
            }));
        }
    }, [state.prompt, state.cursorLine, state.selectedText, code, aiEndpoint]);

    // ─── Accept Generated Code ───────────────────────────
    const handleAccept = useCallback(() => {
        if (!state.generatedCode) return;

        const editor = editorRef.current;
        if (editor && state.selectedText) {
            // Replace selection
            const selection = editor.getSelection();
            if (selection) {
                editor.executeEdits("keystone-inline-gen", [
                    {
                        range: selection,
                        text: state.generatedCode,
                    },
                ]);
            }
        } else {
            // Insert the generated code into the full code at cursor line
            const lines = code.split("\n");
            lines.splice(state.cursorLine, 0, state.generatedCode);
            onInsert(lines.join("\n"));
        }

        setState((prev) => ({
            ...prev,
            isOpen: false,
            generatedCode: null,
            prompt: "",
        }));
    }, [state.generatedCode, state.selectedText, state.cursorLine, code, onInsert, editorRef]);

    // ─── Dismiss ─────────────────────────────────────────
    const handleDismiss = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isOpen: false,
            generatedCode: null,
            prompt: "",
            error: null,
        }));
    }, []);

    // ─── Keyboard Shortcuts ──────────────────────────────
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (state.generatedCode) {
                    handleAccept();
                } else {
                    handleGenerate();
                }
            }
            if (e.key === "Escape") {
                handleDismiss();
            }
        },
        [state.generatedCode, handleAccept, handleGenerate, handleDismiss]
    );

    if (!state.isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="absolute left-4 right-4 z-50 mt-2"
            style={{ top: `${Math.min(state.cursorLine * 20 + 40, 200)}px` }}
        >
            <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl shadow-2xl shadow-emerald-500/10 overflow-hidden">
                {/* Input Bar */}
                <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={state.prompt}
                        onChange={(e) => setState((prev) => ({ ...prev, prompt: e.target.value }))}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            state.selectedText
                                ? "Describe how to transform the selection…"
                                : "Describe code to generate at cursor…"
                        }
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                        disabled={state.loading}
                    />
                    {state.loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                        <button
                            onClick={state.generatedCode ? handleAccept : handleGenerate}
                            disabled={!state.prompt.trim()}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-md text-xs font-bold text-white transition-colors flex items-center gap-1"
                        >
                            {state.generatedCode ? (
                                <>
                                    <Check className="w-3 h-3" /> Accept
                                </>
                            ) : (
                                <>
                                    Generate <ChevronRight className="w-3 h-3" />
                                </>
                            )}
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                    >
                        <X className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                </div>

                {/* Preset Chips */}
                {!state.generatedCode && !state.loading && !state.prompt && (
                    <div className="flex flex-wrap gap-1.5 p-3 border-b border-zinc-800">
                        {PRESETS.map((p) => (
                            <button
                                key={p.label}
                                onClick={() => setState((prev) => ({ ...prev, prompt: p.prompt }))}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Context Badge */}
                {state.selectedText && (
                    <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-800">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                            Selection ({state.selectedText.split("\n").length} lines)
                        </span>
                    </div>
                )}

                {/* Generated Code Preview */}
                {state.generatedCode && (
                    <div className="max-h-64 overflow-auto">
                        <pre className="p-3 text-xs font-mono text-emerald-300/90 bg-emerald-500/5 leading-relaxed whitespace-pre-wrap">
                            {state.generatedCode}
                        </pre>
                    </div>
                )}

                {/* Error */}
                {state.error && (
                    <div className="px-3 py-2 text-xs text-red-400 bg-red-500/5">
                        {state.error}
                    </div>
                )}

                {/* Footer Hint */}
                <div className="px-3 py-1.5 bg-zinc-950 text-[10px] text-zinc-600 flex items-center justify-between">
                    <span>
                        <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500 font-mono">Enter</kbd>
                        {" "}{state.generatedCode ? "Accept" : "Generate"}
                        {" · "}
                        <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500 font-mono">Esc</kbd>
                        {" "}Dismiss
                    </span>
                    <span className="text-emerald-500/50">Keystone AI Architect</span>
                </div>
            </div>
        </div>
    );
}
