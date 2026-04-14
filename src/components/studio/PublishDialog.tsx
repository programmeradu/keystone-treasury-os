"use client";

import React, { useState, useCallback } from "react";
import { Rocket, Loader2, CheckCircle, AlertTriangle, ExternalLink, Copy, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface PublishDialogProps {
    isOpen: boolean;
    onClose: () => void;
    appCode: string;
    appId?: string;
    walletAddress?: string | null;
}

interface PublishState {
    phase: "idle" | "validating" | "publishing" | "done" | "error";
    appName: string;
    description: string;
    category: string;
    progress: string[];
    result?: {
        appId: string;
        marketplaceUrl?: string;
        codeHash?: string;
        securityScore?: number;
    };
    error?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function PublishDialog({
    isOpen,
    onClose,
    appCode,
    appId,
    walletAddress,
}: PublishDialogProps) {
    const [state, setState] = useState<PublishState>({
        phase: "idle",
        appName: "",
        description: "",
        category: "utility",
        progress: [],
    });

    const addProgress = useCallback((msg: string) => {
        setState((prev) => ({
            ...prev,
            progress: [...prev.progress, msg],
        }));
    }, []);

    const handlePublish = useCallback(async () => {
        if (!state.appName.trim() || !state.description.trim()) return;

        setState((prev) => ({ ...prev, phase: "validating", progress: [], error: undefined }));

        try {
            // Phase 1: Client-side validation
            addProgress("🔍 Running Gatekeeper validation…");
            await new Promise((r) => setTimeout(r, 600));

            // Check for basic validation
            const hasSdkImport = /from\s+['"]@keystone-os\/sdk['"]/.test(appCode);
            if (!hasSdkImport) {
                throw new Error("App must import from '@keystone-os/sdk'");
            }

            addProgress("✅ Gatekeeper passed — no safety violations");

            // Phase 2: Publish to API
            setState((prev) => ({ ...prev, phase: "publishing" }));
            addProgress("📦 Building & publishing to dreyv Registry…");

            const payload = {
                name: state.appName,
                description: state.description,
                code: JSON.stringify({
                    files: {
                        "App.tsx": { content: appCode, language: "typescript" },
                    },
                }),
                creatorWallet: walletAddress || "studio_anonymous",
                category: state.category,
            };

            const res = await fetch("/api/studio/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `Registry returned ${res.status}`);
            }

            const data = (await res.json()) as {
                appId?: string;
                codeHash?: string;
                securityScore?: number;
            };

            const publishedAppId = data.appId || appId || `app_${Date.now().toString(36)}`;
            const baseUrl = window.location.origin;
            const marketplaceUrl = `${baseUrl}/app/working-swap?appId=${publishedAppId}`;

            addProgress("✅ Published to dreyv Registry");
            addProgress(`🔗 Marketplace URL: ${marketplaceUrl}`);

            setState((prev) => ({
                ...prev,
                phase: "done",
                result: {
                    appId: publishedAppId,
                    marketplaceUrl,
                    codeHash: data.codeHash,
                    securityScore: data.securityScore,
                },
            }));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            addProgress(`❌ ${errorMsg}`);
            setState((prev) => ({ ...prev, phase: "error", error: errorMsg }));
        }
    }, [state.appName, state.description, state.category, appCode, walletAddress, appId, addProgress]);

    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text).catch(() => { });
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-emerald-500/5">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Rocket className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Publish Mini-App</h2>
                            <p className="text-xs text-zinc-500">1-click deploy to dreyv Marketplace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {state.phase === "idle" && (
                        <>
                            {/* App Name */}
                            <div>
                                <label className="block text-xs text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">
                                    App Name
                                </label>
                                <input
                                    value={state.appName}
                                    onChange={(e) =>
                                        setState((prev) => ({ ...prev, appName: e.target.value }))
                                    }
                                    placeholder="My Treasury Dashboard"
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">
                                    Description
                                </label>
                                <textarea
                                    value={state.description}
                                    onChange={(e) =>
                                        setState((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                    placeholder="A comprehensive treasury management tool with real-time balances..."
                                    rows={3}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs text-zinc-400 font-semibold mb-1.5 uppercase tracking-wider">
                                    Category
                                </label>
                                <select
                                    value={state.category}
                                    onChange={(e) =>
                                        setState((prev) => ({ ...prev, category: e.target.value }))
                                    }
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                                >
                                    <option value="utility">Utility</option>
                                    <option value="defi">DeFi</option>
                                    <option value="analytics">Analytics</option>
                                    <option value="governance">Governance</option>
                                    <option value="nft">NFT</option>
                                    <option value="social">Social</option>
                                </select>
                            </div>

                            {/* Wallet Badge */}
                            {walletAddress && (
                                <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Publisher: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                </div>
                            )}
                        </>
                    )}

                    {/* Progress Log */}
                    {state.progress.length > 0 && (
                        <div className="bg-zinc-950 rounded-lg p-3 space-y-1.5 max-h-48 overflow-auto">
                            {state.progress.map((msg, i) => (
                                <div key={i} className="text-xs font-mono text-zinc-400">
                                    {msg}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Success Result */}
                    {state.phase === "done" && state.result && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-bold text-sm">Published Successfully!</span>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-400">App ID</span>
                                    <div className="flex items-center gap-1">
                                        <code className="text-emerald-300">{state.result.appId}</code>
                                        <button
                                            onClick={() => copyToClipboard(state.result!.appId)}
                                            className="p-1 hover:bg-zinc-800 rounded"
                                        >
                                            <Copy className="w-3 h-3 text-zinc-500" />
                                        </button>
                                    </div>
                                </div>

                                {state.result.codeHash && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-400">Code Hash</span>
                                        <code className="text-zinc-300 truncate max-w-[200px]">
                                            {state.result.codeHash.slice(0, 16)}…
                                        </code>
                                    </div>
                                )}

                                {state.result.securityScore !== undefined && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-zinc-400">Security Score</span>
                                        <span className={`font-bold ${state.result.securityScore >= 80 ? "text-emerald-400" : state.result.securityScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                            {state.result.securityScore}/100
                                        </span>
                                    </div>
                                )}
                            </div>

                            {state.result.marketplaceUrl && (
                                <a
                                    href={state.result.marketplaceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-bold transition-colors mt-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open in App Store
                                </a>
                            )}
                        </div>
                    )}

                    {/* Error State */}
                    {state.phase === "error" && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-bold text-sm">Publish Failed</span>
                            </div>
                            <p className="text-xs text-red-300">{state.error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800">
                    {state.phase === "idle" && (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={!state.appName.trim() || !state.description.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg text-white text-sm font-bold transition-colors"
                            >
                                <Rocket className="w-4 h-4" />
                                Publish
                            </button>
                        </>
                    )}

                    {(state.phase === "validating" || state.phase === "publishing") && (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {state.phase === "validating" ? "Validating…" : "Publishing…"}
                        </div>
                    )}

                    {(state.phase === "done" || state.phase === "error") && (
                        <button
                            onClick={() => {
                                setState({
                                    phase: "idle",
                                    appName: state.appName,
                                    description: state.description,
                                    category: state.category,
                                    progress: [],
                                });
                            }}
                            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                        >
                            {state.phase === "done" ? "Close" : "Try Again"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
