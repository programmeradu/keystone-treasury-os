"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, Activity, Loader2, Cpu, Zap, Shield, AlertTriangle, ChevronDown } from "lucide-react";
import { ArchitectIcon } from "@/components/icons";
import { getAvatarUrl } from "@/lib/avatars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSelf } from "@/liveblocks.config";
import { cn } from "@/lib/utils";
import { ArchitectEngine, type ArchitectStatus, type ArchitectState } from "@/lib/studio/architect-engine";
import { loadAIConfig, type AIKeyConfig } from "@/components/studio/APIKeySettings";

// ─── Types ──────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    codeGenerated?: boolean;
    state?: ArchitectState;
}

interface PromptChatProps {
    onGenerate: (files: Record<string, string>) => void;
    isGenerating: boolean;
    setIsGenerating: (value: boolean) => void;
    userFiles: Record<string, any>;
    runtimeLogs?: string[];
}

// ─── State Label Map ────────────────────────────────────────────────

const STATE_LABELS: Record<ArchitectState, { label: string; color: string; icon: string }> = {
    IDLE: { label: "IDLE", color: "text-zinc-500", icon: "" },
    STREAMING: { label: "GENERATING", color: "text-cyan-400", icon: "animate-pulse" },
    ANALYZING: { label: "ANALYZING", color: "text-yellow-400", icon: "" },
    CORRECTING: { label: "SELF-CORRECTING", color: "text-orange-400", icon: "animate-pulse" },
    RE_ANALYZING: { label: "RE-ANALYZING", color: "text-yellow-400", icon: "" },
    CLEAN: { label: "CLEAN BUILD", color: "text-emerald-400", icon: "" },
    FAILED: { label: "ERRORS REMAIN", color: "text-red-400", icon: "" },
};

// ─── Available Models ───────────────────────────────────────────────

interface ModelOption {
    id: string;
    label: string;
    provider: string;
    byok?: boolean;
}

const FREE_MODELS: ModelOption[] = [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Fast", provider: "groq" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", provider: "groq" },
    { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "CF Llama 3.3 70B", provider: "cloudflare" },
    { id: "@cf/qwen/qwen2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B", provider: "cloudflare" },
    { id: "@cf/qwen/qwen3-30b-a3b-fp8", label: "Qwen 3 30B", provider: "cloudflare" },
];

const BYOK_MODELS: Record<string, ModelOption[]> = {
    openai: [
        { id: "gpt-4o", label: "GPT-4o", provider: "openai", byok: true },
        { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai", byok: true },
        { id: "o1", label: "o1", provider: "openai", byok: true },
        { id: "o3-mini", label: "o3-mini", provider: "openai", byok: true },
    ],
    google: [
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "google", byok: true },
        { id: "gemini-2.0-pro", label: "Gemini 2.0 Pro", provider: "google", byok: true },
    ],
    anthropic: [
        { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic", byok: true },
        { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "anthropic", byok: true },
        { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", provider: "anthropic", byok: true },
    ],
    groq: [
        { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (BYOK)", provider: "groq", byok: true },
    ],
    ollama: [
        { id: "qwen2.5-coder:7b", label: "Qwen2.5-Coder 7B", provider: "ollama", byok: true },
        { id: "qwen2.5-coder:32b", label: "Qwen2.5-Coder 32B", provider: "ollama", byok: true },
        { id: "codellama:7b", label: "CodeLlama 7B", provider: "ollama", byok: true },
    ],
};

// ─── Component ──────────────────────────────────────────────────────

export function PromptChat({ onGenerate, isGenerating, setIsGenerating, userFiles, runtimeLogs }: PromptChatProps) {
    const user = useSelf();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Architect initialized. Self-correction engine online.\n\nCapabilities:\n\u2022 Protocol Synthesizer\n\u2022 Treasury Logic Constructor\n\u2022 Auto Error Detection & Fix (3 attempts)\n\nAwaiting specifications...",
            timestamp: new Date(),
        },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [useDeepResearch, setUseDeepResearch] = useState(false);
    const [architectStatus, setArchitectStatus] = useState<ArchitectStatus | null>(null);
    const engineRef = useRef<ArchitectEngine | null>(null);
    const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [byokConfig, setByokConfig] = useState<AIKeyConfig | null>(null);

    // Load BYOK config on mount
    useEffect(() => {
        try {
            const config = loadAIConfig();
            setByokConfig(config);
        } catch { /* no config */ }
    }, []);

    // Build dynamic model list: BYOK models first (if configured), then free models
    const availableModels = useMemo(() => {
        const models: ModelOption[] = [];
        if (byokConfig?.apiKey && byokConfig.provider) {
            const byokModels = BYOK_MODELS[byokConfig.provider];
            if (byokModels) models.push(...byokModels);
        }
        models.push(...FREE_MODELS);
        return models;
    }, [byokConfig]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ─── Architect Engine Setup ─────────────────────────────
    const getEngine = useCallback(() => {
        if (!engineRef.current) {
            engineRef.current = new ArchitectEngine({
                onStateChange: (status) => {
                    setArchitectStatus({ ...status });
                },
                onFilesGenerated: (files) => {
                    onGenerate(files);
                },
                onExplanation: () => {
                    // Explanation handled via message update below
                },
                onError: (error) => {
                    console.error("[Architect]", error);
                },
            });
        }
        return engineRef.current;
    }, [onGenerate]);

    // ─── Submit Handler ─────────────────────────────────────
    const handleSubmit = async () => {
        if (!input.trim() || isGenerating) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsGenerating(true);

        const thinkingId = (Date.now() + 1).toString();
        setMessages((prev) => [
            ...prev,
            {
                id: thinkingId,
                role: "assistant",
                content: useDeepResearch
                    ? "Initiating deep research protocol..."
                    : "Initializing self-correction pipeline...",
                timestamp: new Date(),
                state: "STREAMING",
            },
        ]);

        let researchContext = "";

        try {
            // ─── Deep Research (optional) ───────────────────
            if (useDeepResearch) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === thinkingId
                            ? { ...m, content: "Scanning decentralized protocols..." }
                            : m
                    )
                );

                try {
                    const researchRes = await fetch("/api/agent/knowledge", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ query: userMessage.content }),
                    });

                    if (researchRes.ok) {
                        const researchData = await researchRes.json();
                        researchContext = `\n\n[RESEARCH CONTEXT based on: ${researchData.query}]\nSummary: ${researchData.summary}\nTechnical Reference: ${researchData.rawContent}`;

                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === thinkingId
                                    ? {
                                        ...m,
                                        content: `Research complete. Synthesizing implementation...`,
                                    }
                                    : m
                            )
                        );
                    }
                } catch {
                    // Research failed — continue without it
                }
            }

            // ─── Run Architect Engine ───────────────────────
            const engine = getEngine();

            // Subscribe to state changes for message updates
            const originalOnState = engine["callbacks"].onStateChange;
            engine["callbacks"].onStateChange = (status: ArchitectStatus) => {
                originalOnState(status);

                // Update thinking message based on state
                const stateMsg = getStateMessage(status);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === thinkingId
                            ? { ...m, content: stateMsg, state: status.state }
                            : m
                    )
                );
            };

            engine["callbacks"].onExplanation = (explanation: string) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === thinkingId
                            ? {
                                ...m,
                                content: `Generation complete.\n\n${explanation}`,
                                codeGenerated: true,
                                state: "CLEAN",
                            }
                            : m
                    )
                );
            };

            engine["callbacks"].onFilesGenerated = (files: Record<string, string>) => {
                const status = engine.getStatus();
                const fileCount = Object.keys(files).length;
                const wasClean = status.state === "CLEAN";

                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === thinkingId
                            ? {
                                ...m,
                                content: wasClean
                                    ? `${fileCount} module(s) synthesized. Clean build.${status.attempt > 0 ? ` (${status.attempt} correction(s) applied)` : ""}`
                                    : `${fileCount} module(s) generated with ${status.errors.length} remaining issue(s) after ${status.attempt} correction attempt(s).`,
                                codeGenerated: true,
                                state: status.state,
                            }
                            : m
                    )
                );

                onGenerate(files);
            };

            engine["callbacks"].onError = (error: string) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === thinkingId
                            ? {
                                ...m,
                                content: `Generation issue:\n${error}`,
                                state: "FAILED",
                            }
                            : m
                    )
                );
            };

            const selectedModelInfo = availableModels.find(m => m.id === selectedModel);
            const isByok = selectedModelInfo?.byok && byokConfig?.apiKey;

            await engine.generate(
                userMessage.content,
                userFiles,
                runtimeLogs,
                researchContext || undefined,
                {
                    provider: selectedModelInfo?.provider || "groq",
                    apiKey: isByok ? byokConfig!.apiKey : "",
                    model: selectedModel,
                }
            );
        } catch (error) {
            console.error("PromptChat Error:", error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === thinkingId
                        ? {
                            ...m,
                            content: `Generation failed.\n\n${error instanceof Error ? error.message : "Unknown error"}`,
                            state: "FAILED",
                        }
                        : m
                )
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Status Bar */}
            {architectStatus && architectStatus.state !== "IDLE" && (
                <ArchitectStatusBar status={architectStatus} />
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-3 scrollbar-thin min-h-0" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-2",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {message.role === "assistant" && (
                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                    <ArchitectIcon size={14} />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "max-w-[88%] rounded-xl px-4 py-3 text-[13px] leading-relaxed shadow-sm",
                                    message.role === "user"
                                        ? "bg-primary text-background font-bold tracking-tight"
                                        : "bg-muted/20 text-foreground border border-border/40 font-medium",
                                    message.codeGenerated && "border-primary/40 bg-primary/5 text-primary shadow-[0_0_20px_rgba(54,226,123,0.05)] font-bold tracking-tight",
                                    message.state === "STREAMING" && "border-cyan-400/30 bg-cyan-400/5",
                                    message.state === "CORRECTING" && "border-orange-400/30 bg-orange-400/5",
                                    message.state === "FAILED" && "border-red-400/30 bg-red-400/5"
                                )}
                            >
                                <pre className="whitespace-pre-wrap font-sans">
                                    {message.content}
                                </pre>
                            </div>
                            {message.role === "user" && (
                                <Avatar className="h-6 w-6 shrink-0 border border-border">
                                    <AvatarImage src={getAvatarUrl(user?.info?.name || "User")} />
                                    <AvatarFallback className="text-[8px] font-bold">
                                        {user?.info?.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border">
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you want to build..."
                        disabled={isGenerating}
                        className="resize-none pr-12 min-h-[80px] bg-background/50 pl-12 pb-10"
                        rows={3}
                    />

                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                            "absolute top-2 left-2 h-8 w-8 transition-colors",
                            useDeepResearch ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setUseDeepResearch(!useDeepResearch)}
                        title="Enable Deep Research"
                    >
                        <Cpu size={16} className={cn(useDeepResearch && "animate-pulse")} />
                    </Button>
                    <Button
                        size="icon"
                        className="absolute bottom-2 right-2 h-8 w-8"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isGenerating}
                    >
                        {isGenerating ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <ArrowUp size={14} />
                        )}
                    </Button>

                    {/* Model selector — inside textbox, bottom-left */}
                    <div className="absolute bottom-2 left-2 z-10">
                        <div className="relative">
                            <button
                                onClick={() => setShowModelDropdown(!showModelDropdown)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors bg-muted/40 hover:bg-muted/70 border border-border/30"
                            >
                                {availableModels.find(m => m.id === selectedModel)?.label || selectedModel}
                                <ChevronDown size={8} className={cn("transition-transform", showModelDropdown && "rotate-180")} />
                            </button>

                            {showModelDropdown && (
                                <div className="absolute bottom-full left-0 mb-1 w-56 rounded-md border border-border bg-popover shadow-lg z-50 py-1 max-h-64 overflow-auto">
                                    {byokConfig?.apiKey && (
                                        <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-purple-400/60 border-b border-border/30 mb-0.5">
                                            Your Models ({byokConfig.provider})
                                        </div>
                                    )}
                                    {availableModels.map((model, i) => {
                                        const isFirstFree = model === FREE_MODELS[0] && byokConfig?.apiKey;
                                        return (
                                            <React.Fragment key={model.id + (model.byok ? "-byok" : "")}>
                                                {isFirstFree && (
                                                    <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 border-t border-border/30 mt-0.5">
                                                        Free Models
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectedModel(model.id);
                                                        setShowModelDropdown(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors flex items-center gap-2",
                                                        selectedModel === model.id
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                    )}
                                                >
                                                    <span className="flex-1">{model.label}</span>
                                                    {model.byok && (
                                                        <span className="text-[8px] text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded uppercase tracking-wider font-bold">key</span>
                                                    )}
                                                </button>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-[9px] text-muted-foreground mt-2 text-center font-bold tracking-[0.1em] uppercase opacity-40">
                    <Activity size={10} className="inline mr-2 text-primary" />
                    Architect Engine v2.0 — Self-Correction Active
                </p>
            </div>
        </div>
    );
}

// ─── Status Bar Sub-Component ───────────────────────────────────────

function ArchitectStatusBar({ status }: { status: ArchitectStatus }) {
    const info = STATE_LABELS[status.state];
    const elapsed = Math.round(status.elapsedMs / 1000);

    return (
        <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest shrink-0">
            {/* State */}
            <div className={cn("flex items-center gap-1.5", info.color)}>
                {(status.state === "STREAMING" || status.state === "CORRECTING") && (
                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                )}
                {status.state === "CLEAN" && <Zap size={10} />}
                {status.state === "FAILED" && <AlertTriangle size={10} />}
                {status.state === "ANALYZING" || status.state === "RE_ANALYZING" ? (
                    <Shield size={10} />
                ) : null}
                <span>{info.label}</span>
            </div>

            <div className="h-3 w-px bg-border/60" />

            {/* Attempts */}
            {status.attempt > 0 && (
                <>
                    <span className="text-orange-400">
                        FIX {status.attempt}/{status.maxAttempts}
                    </span>
                    <div className="h-3 w-px bg-border/60" />
                </>
            )}

            {/* Tokens */}
            <span className="text-zinc-500">
                ~{status.tokensGenerated.toLocaleString()} tok
            </span>

            <div className="h-3 w-px bg-border/60" />

            {/* Elapsed */}
            <span className="text-zinc-500">{elapsed}s</span>

            {/* Model */}
            <span className="ml-auto text-zinc-600">{status.model}</span>
        </div>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────

function getStateMessage(status: ArchitectStatus): string {
    switch (status.state) {
        case "STREAMING":
            return "Generating code...";
        case "ANALYZING":
            return "Analyzing generated code for errors...";
        case "CORRECTING":
            return `Self-correction attempt ${status.attempt}/${status.maxAttempts}...\nFixing: ${status.errors.slice(0, 2).join("; ")}`;
        case "RE_ANALYZING":
            return `Re-analyzing after correction ${status.attempt}...`;
        case "CLEAN":
            return "Clean build achieved.";
        case "FAILED":
            return `Self-correction exhausted. ${status.errors.length} issue(s) remain.`;
        default:
            return "Processing...";
    }
}
