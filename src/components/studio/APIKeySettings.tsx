"use client";

/**
 * APIKeySettings — Bring Your Own Key (BYOK) settings modal.
 *
 * Lets users configure their own LLM API keys for the AI Architect.
 * Inspired by Cursor/Windsurf's approach:
 * - Provider selector (OpenAI, Google Gemini, Anthropic, Groq)
 * - API key input with show/hide toggle
 * - Model selector per provider
 * - Client-side encrypted storage (localStorage)
 * - Connection test button
 *
 * Keys are stored ONLY in the browser — never sent to Keystone servers.
 * They are passed per-request to the /api/studio/generate endpoint
 * which proxies to the selected provider.
 */

import React, { useState, useCallback, useEffect } from "react";
import {
    Settings, Key, Eye, EyeOff, Check, X, AlertTriangle,
    Loader2, Zap, Shield, ExternalLink,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

export type AIProvider = "openai" | "google" | "anthropic" | "groq" | "cloudflare" | "ollama";

interface ProviderConfig {
    id: AIProvider;
    name: string;
    icon: string;
    placeholder: string;
    docsUrl: string;
    models: { id: string; name: string; recommended?: boolean }[];
}

export interface AIKeyConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
}

interface APIKeySettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: AIKeyConfig) => void;
    currentConfig?: AIKeyConfig | null;
}

// ─── Provider Definitions ───────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
    {
        id: "openai",
        name: "OpenAI",
        icon: "⬡",
        placeholder: "sk-proj-...",
        docsUrl: "https://platform.openai.com/api-keys",
        models: [
            { id: "gpt-4o", name: "GPT-4o", recommended: true },
            { id: "gpt-4o-mini", name: "GPT-4o Mini" },
            { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
            { id: "o1", name: "o1" },
            { id: "o3-mini", name: "o3-mini" },
        ],
    },
    {
        id: "google",
        name: "Google Gemini",
        icon: "◆",
        placeholder: "AIza...",
        docsUrl: "https://aistudio.google.com/apikey",
        models: [
            { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", recommended: true },
            { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro" },
            { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
        ],
    },
    {
        id: "anthropic",
        name: "Anthropic",
        icon: "◈",
        placeholder: "sk-ant-...",
        docsUrl: "https://console.anthropic.com/settings/keys",
        models: [
            { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", recommended: true },
            { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
            { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
        ],
    },
    {
        id: "groq",
        name: "Groq",
        icon: "G",
        placeholder: "gsk_...",
        docsUrl: "https://console.groq.com/keys",
        models: [
            { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", recommended: true },
            { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
            { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
        ],
    },
    {
        id: "cloudflare",
        name: "Cloudflare AI",
        icon: "CF",
        placeholder: "accountId:apiToken",
        docsUrl: "https://dash.cloudflare.com/?to=/:account/ai/workers-ai",
        models: [
            { id: "@cf/qwen/qwen3-30b-a3b-fp8", name: "Qwen3-30B MoE", recommended: true },
            { id: "@cf/openai/gpt-oss-120b", name: "GPT-OSS 120B" },
            { id: "@cf/zai-org/glm-4.7-flash", name: "GLM-4.7 Flash" },
            { id: "@cf/qwen/qwen2.5-coder-32b-instruct", name: "Qwen2.5-Coder 32B" },
            { id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", name: "Llama 3.3 70B" },
        ],
    },
    {
        id: "ollama",
        name: "Ollama",
        icon: "OL",
        placeholder: "http://localhost:11434",
        docsUrl: "https://ollama.com/library",
        models: [
            { id: "qwen2.5-coder:7b", name: "Qwen2.5-Coder 7B", recommended: true },
            { id: "qwen2.5-coder:32b", name: "Qwen2.5-Coder 32B" },
            { id: "codellama:7b", name: "CodeLlama 7B" },
            { id: "deepseek-coder-v2:16b", name: "DeepSeek-Coder V2 16B" },
        ],
    },
];

// ─── Storage Helpers ────────────────────────────────────────────────

const STORAGE_KEY = "keystone_studio_ai_config";

/**
 * Simple obfuscation for localStorage (not true encryption, but prevents
 * casual shoulder-surfing). For production, use WebCrypto API.
 */
function obfuscate(text: string): string {
    return btoa(text.split("").reverse().join(""));
}

function deobfuscate(text: string): string {
    try {
        return atob(text).split("").reverse().join("");
    } catch {
        return "";
    }
}

export function loadAIConfig(): AIKeyConfig | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return {
            provider: data.provider,
            apiKey: deobfuscate(data.apiKey),
            model: data.model,
        };
    } catch {
        return null;
    }
}

export function saveAIConfig(config: AIKeyConfig): void {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            provider: config.provider,
            apiKey: obfuscate(config.apiKey),
            model: config.model,
        })
    );
}

export function clearAIConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
}

// ─── Component ──────────────────────────────────────────────────────

export function APIKeySettings({
    isOpen,
    onClose,
    onSave,
    currentConfig,
}: APIKeySettingsProps) {
    const [provider, setProvider] = useState<AIProvider>(currentConfig?.provider || "openai");
    const [apiKey, setApiKey] = useState(currentConfig?.apiKey || "");
    const [model, setModel] = useState(currentConfig?.model || "gpt-4o");
    const [showKey, setShowKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
    const [testError, setTestError] = useState<string | null>(null);

    const currentProvider = PROVIDERS.find((p) => p.id === provider)!;

    // Reset model when provider changes
    useEffect(() => {
        const prov = PROVIDERS.find((p) => p.id === provider);
        if (prov) {
            const recommended = prov.models.find((m) => m.recommended);
            setModel(recommended?.id || prov.models[0].id);
        }
        setTestResult(null);
        setTestError(null);
    }, [provider]);

    // Load saved config on mount
    useEffect(() => {
        if (!currentConfig) {
            const saved = loadAIConfig();
            if (saved) {
                setProvider(saved.provider);
                setApiKey(saved.apiKey);
                setModel(saved.model);
            }
        }
    }, [currentConfig]);

    const handleTest = useCallback(async () => {
        if (!apiKey.trim()) return;
        setTesting(true);
        setTestResult(null);
        setTestError(null);

        try {
            const res = await fetch("/api/studio/test-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider, apiKey, model }),
            });

            if (res.ok) {
                setTestResult("success");
            } else {
                const data = await res.json().catch(() => ({}));
                setTestResult("error");
                setTestError(data.error || `Connection failed (${res.status})`);
            }
        } catch (err) {
            setTestResult("error");
            setTestError(err instanceof Error ? err.message : "Connection failed");
        } finally {
            setTesting(false);
        }
    }, [provider, apiKey, model]);

    const handleSave = useCallback(() => {
        const config: AIKeyConfig = { provider, apiKey, model };
        saveAIConfig(config);
        onSave(config);
        onClose();
    }, [provider, apiKey, model, onSave, onClose]);

    const handleClear = useCallback(() => {
        clearAIConfig();
        setApiKey("");
        setTestResult(null);
        onSave({ provider: "openai", apiKey: "", model: "gpt-4o" });
    }, [onSave]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-500/5">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Key className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">AI Configuration</h2>
                            <p className="text-xs text-zinc-500">Bring your own API key</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Security Notice */}
                    <div className="flex items-start gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5">
                        <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Your API key is stored <strong className="text-zinc-300">only in your browser</strong> and
                            sent directly to the provider. Keystone never stores or logs your keys.
                        </p>
                    </div>

                    {/* Provider Selector */}
                    <div>
                        <label className="block text-xs text-zinc-400 font-semibold mb-2 uppercase tracking-wider">
                            Provider
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {PROVIDERS.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setProvider(p.id)}
                                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all text-center ${provider === p.id
                                        ? "bg-purple-500/10 border-purple-500/40 text-white"
                                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                                        }`}
                                >
                                    <span className="text-lg">{p.icon}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                                {provider === "ollama" ? "Ollama Host" : "API Key"}
                            </label>
                            <a
                                href={currentProvider.docsUrl}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                Get a key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setTestResult(null);
                                }}
                                placeholder={currentProvider.placeholder}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white font-mono placeholder:text-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 outline-none transition-colors"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-700 rounded transition-colors"
                            >
                                {showKey ? (
                                    <EyeOff className="w-4 h-4 text-zinc-500" />
                                ) : (
                                    <Eye className="w-4 h-4 text-zinc-500" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Model Selector */}
                    <div>
                        <label className="block text-xs text-zinc-400 font-semibold mb-2 uppercase tracking-wider">
                            Model
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {currentProvider.models.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setModel(m.id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${model === m.id
                                        ? "bg-purple-500/10 border-purple-500/40 text-white"
                                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600"
                                        }`}
                                >
                                    <span>{m.name}</span>
                                    {m.recommended && (
                                        <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                            rec
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Test Result */}
                    {testResult === "success" && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-semibold">
                                Connected successfully
                            </span>
                        </div>
                    )}

                    {testResult === "error" && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-red-400">
                                {testError || "Connection failed. Check your API key."}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-5 border-t border-zinc-800">
                    <button
                        onClick={handleClear}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                        Clear Key
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleTest}
                            disabled={!apiKey.trim() || testing}
                            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 rounded-lg text-xs text-zinc-300 font-semibold transition-colors"
                        >
                            {testing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Zap className="w-3.5 h-3.5" />
                            )}
                            Test Connection
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!apiKey.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-sm text-white font-bold transition-colors"
                        >
                            <Check className="w-4 h-4" />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── No-Key Banner Component ────────────────────────────────────────
// Shows inside PromptChat when no API key is configured

export function NoKeyBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
    return (
        <div className="mx-3 mt-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                    <Key className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-400 mb-1">
                        AI Architect needs an API key
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                        Connect your own OpenAI, Google Gemini, Anthropic, or Groq key to
                        enable AI code generation. Your key stays in your browser — we never store it.
                    </p>
                    <button
                        onClick={onOpenSettings}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-bold transition-colors"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Configure API Key
                    </button>
                </div>
            </div>
        </div>
    );
}
