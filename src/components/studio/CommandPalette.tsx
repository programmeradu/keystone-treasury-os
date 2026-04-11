"use client";

/**
 * CommandPalette — Cmd+Shift+P / Ctrl+Shift+P command palette for Studio.
 *
 * Cursor/VS Code-style fuzzy-match command picker.
 * Registers all toolbar actions, AI actions, and file operations.
 *
 * [P2] — Command Palette
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Command, FileCode, Sparkles, Save, FolderOpen, Play, FileText, Search, Download, Rocket, Settings } from "lucide-react";

export interface PaletteCommand {
    id: string;
    label: string;
    category: string;
    icon?: React.ReactNode;
    shortcut?: string;
    action: () => void;
}

interface CommandPaletteProps {
    commands: PaletteCommand[];
    isOpen: boolean;
    onClose: () => void;
}

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    if (!q) return { match: true, score: 0 };
    if (t.includes(q)) return { match: true, score: 100 - t.indexOf(q) };

    let qi = 0;
    let score = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            score += 10;
            // Bonus for consecutive matches
            if (ti > 0 && t[ti - 1] === q[qi - 1]) score += 5;
            qi++;
        }
    }

    return { match: qi === q.length, score };
}

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        if (!query.trim()) return commands;

        return commands
            .map((cmd) => {
                const result = fuzzyMatch(query, `${cmd.category} ${cmd.label}`);
                return { cmd, ...result };
            })
            .filter((r) => r.match)
            .sort((a, b) => b.score - a.score)
            .map((r) => r.cmd);
    }, [commands, query]);

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const item = list.children[selectedIndex] as HTMLElement;
        if (item) item.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[selectedIndex]) {
                    filtered[selectedIndex].action();
                    onClose();
                }
            } else if (e.key === "Escape") {
                onClose();
            }
        },
        [filtered, selectedIndex, onClose]
    );

    if (!isOpen) return null;

    // Group by category
    const categories = new Map<string, PaletteCommand[]>();
    for (const cmd of filtered) {
        if (!categories.has(cmd.category)) categories.set(cmd.category, []);
        categories.get(cmd.category)!.push(cmd);
    }

    let flatIndex = 0;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                    <Command className="w-4 h-4 text-zinc-500 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                    />
                    <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-500 font-mono">Esc</kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-[50vh] overflow-auto py-1">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-8 text-center text-zinc-600 text-sm">
                            No commands match &quot;{query}&quot;
                        </div>
                    ) : (
                        Array.from(categories.entries()).map(([category, cmds]) => (
                            <div key={category}>
                                <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                                    {category}
                                </div>
                                {cmds.map((cmd) => {
                                    const idx = flatIndex++;
                                    return (
                                        <button
                                            key={cmd.id}
                                            onClick={() => {
                                                cmd.action();
                                                onClose();
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                                                idx === selectedIndex
                                                    ? "bg-emerald-500/10 text-white"
                                                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                                            }`}
                                        >
                                            <span className="shrink-0 text-zinc-500">{cmd.icon}</span>
                                            <span className="flex-1 text-sm">{cmd.label}</span>
                                            {cmd.shortcut && (
                                                <kbd className="text-[10px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                    {cmd.shortcut}
                                                </kbd>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
