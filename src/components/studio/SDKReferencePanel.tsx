"use client";

/**
 * SDKReferencePanel — Collapsible sidebar showing all SDK hooks with signatures.
 *
 * Quick reference for developers building mini-apps.
 * Shows hook name, signature, return type, and description.
 * Click-to-copy import statement.
 *
 * [P3] — SDK Reference Panel
 */

import React, { useState, useCallback } from "react";
import { BookOpen, ChevronDown, ChevronRight, Copy, Check, X } from "lucide-react";
import { SDK_EXPORTS, IMPORT_ALLOWLIST, BLOCKED_IMPORTS } from "@/lib/studio/framework-spec";

interface SDKReferencePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SDKReferencePanel({ isOpen, onClose }: SDKReferencePanelProps) {
    const [expandedHook, setExpandedHook] = useState<string | null>(null);
    const [copiedHook, setCopiedHook] = useState<string | null>(null);
    const [showBlocked, setShowBlocked] = useState(false);

    const hooks = Object.entries(SDK_EXPORTS).filter(([, s]) => s.type === "hook");
    const objects = Object.entries(SDK_EXPORTS).filter(([, s]) => s.type === "object");

    const copyImport = useCallback((name: string) => {
        const stmt = `import { ${name} } from '@keystone-os/sdk';`;
        navigator.clipboard.writeText(stmt);
        setCopiedHook(name);
        setTimeout(() => setCopiedHook(null), 1500);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="h-full bg-zinc-950 border-l border-zinc-800 flex flex-col w-80">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">SDK Reference</span>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                        {Object.keys(SDK_EXPORTS).length}
                    </span>
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {/* Hooks Section */}
                <div className="px-3 pt-3 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                        Hooks ({hooks.length})
                    </p>
                </div>
                {hooks.map(([name, spec]) => (
                    <div key={name} className="border-b border-zinc-800/50">
                        <button
                            onClick={() => setExpandedHook(expandedHook === name ? null : name)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/30 transition-colors text-left"
                        >
                            {expandedHook === name ? (
                                <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                            ) : (
                                <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                            )}
                            <span className="text-xs font-mono font-bold text-emerald-400">{name}</span>
                        </button>

                        {expandedHook === name && (
                            <div className="px-3 pb-3 pl-8 space-y-2">
                                <div>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-1">Signature</p>
                                    <code className="text-[11px] text-zinc-300 font-mono bg-zinc-800/50 px-2 py-1 rounded block">
                                        {spec.signature}
                                    </code>
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-1">Returns</p>
                                    <code className="text-[11px] text-zinc-400 font-mono bg-zinc-800/50 px-2 py-1 rounded block break-all">
                                        {spec.returns}
                                    </code>
                                </div>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">{spec.description}</p>
                                <button
                                    onClick={() => copyImport(name)}
                                    className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
                                >
                                    {copiedHook === name ? (
                                        <><Check className="w-3 h-3" /> Copied!</>
                                    ) : (
                                        <><Copy className="w-3 h-3" /> Copy import</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {/* Objects Section */}
                {objects.length > 0 && (
                    <>
                        <div className="px-3 pt-4 pb-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                                Objects ({objects.length})
                            </p>
                        </div>
                        {objects.map(([name, spec]) => (
                            <div key={name} className="border-b border-zinc-800/50">
                                <button
                                    onClick={() => setExpandedHook(expandedHook === name ? null : name)}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/30 transition-colors text-left"
                                >
                                    {expandedHook === name ? (
                                        <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                                    )}
                                    <span className="text-xs font-mono font-bold text-purple-400">{name}</span>
                                </button>

                                {expandedHook === name && (
                                    <div className="px-3 pb-3 pl-8 space-y-2">
                                        <div>
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-1">Interface</p>
                                            <code className="text-[11px] text-zinc-400 font-mono bg-zinc-800/50 px-2 py-1 rounded block break-all">
                                                {spec.returns}
                                            </code>
                                        </div>
                                        <p className="text-[11px] text-zinc-500 leading-relaxed">{spec.description}</p>
                                        <button
                                            onClick={() => copyImport(name)}
                                            className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
                                        >
                                            {copiedHook === name ? (
                                                <><Check className="w-3 h-3" /> Copied!</>
                                            ) : (
                                                <><Copy className="w-3 h-3" /> Copy import</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}

                {/* Allowed Imports */}
                <div className="px-3 pt-4 pb-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-2">
                        Allowed Imports
                    </p>
                </div>
                <div className="px-3 pb-3 space-y-1">
                    {Array.from(IMPORT_ALLOWLIST).map((mod) => (
                        <div key={mod} className="flex items-center gap-2 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                            <code className="text-zinc-400 font-mono">{mod}</code>
                        </div>
                    ))}
                </div>

                {/* Common Mistakes */}
                <div className="px-3 pt-2 pb-1">
                    <button
                        onClick={() => setShowBlocked(!showBlocked)}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                        {showBlocked ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        Common Mistakes ({BLOCKED_IMPORTS.length})
                    </button>
                </div>
                {showBlocked && (
                    <div className="px-3 pb-4 space-y-2">
                        {BLOCKED_IMPORTS.map((b) => (
                            <div key={b.library} className="text-[11px] pl-5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-red-400/60">✗</span>
                                    <code className="text-zinc-500 font-mono line-through">{b.library}</code>
                                </div>
                                <p className="text-zinc-600 mt-0.5">→ {b.alternative}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
