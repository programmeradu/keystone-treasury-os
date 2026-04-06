"use client";

/**
 * GlobalSearch — Cmd+Shift+F global search/replace across virtual files.
 *
 * Regex-supported search with file filtering and replace-all capability.
 *
 * [P2] — Global Search & Replace
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Search, Replace, X, ChevronDown, ChevronRight, FileCode } from "lucide-react";

interface StudioFile {
    name: string;
    content: string;
    language: string;
}

interface SearchMatch {
    fileName: string;
    line: number;
    column: number;
    lineContent: string;
    matchText: string;
}

interface GlobalSearchProps {
    files: Record<string, StudioFile>;
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (fileName: string, line: number) => void;
    onReplaceAll: (replacements: { fileName: string; content: string }[]) => void;
}

export function GlobalSearch({
    files,
    isOpen,
    onClose,
    onNavigate,
    onReplaceAll,
}: GlobalSearchProps) {
    const [query, setQuery] = useState("");
    const [replacement, setReplacement] = useState("");
    const [showReplace, setShowReplace] = useState(false);
    const [useRegex, setUseRegex] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
    }, [isOpen]);

    const matches = useMemo(() => {
        if (!query.trim()) return [];

        const results: SearchMatch[] = [];
        let regex: RegExp;

        try {
            regex = useRegex
                ? new RegExp(query, caseSensitive ? "g" : "gi")
                : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
        } catch {
            return [];
        }

        for (const [fileName, file] of Object.entries(files)) {
            const lines = file.content.split("\n");
            for (let i = 0; i < lines.length; i++) {
                let match: RegExpExecArray | null;
                regex.lastIndex = 0;
                while ((match = regex.exec(lines[i])) !== null) {
                    results.push({
                        fileName,
                        line: i + 1,
                        column: match.index + 1,
                        lineContent: lines[i],
                        matchText: match[0],
                    });
                    if (!regex.global) break;
                }
            }
        }

        return results;
    }, [query, files, useRegex, caseSensitive]);

    // Group matches by file
    const groupedMatches = useMemo(() => {
        const groups = new Map<string, SearchMatch[]>();
        for (const m of matches) {
            if (!groups.has(m.fileName)) groups.set(m.fileName, []);
            groups.get(m.fileName)!.push(m);
        }
        return groups;
    }, [matches]);

    // Auto-expand all files with matches
    useEffect(() => {
        setExpandedFiles(new Set(groupedMatches.keys()));
    }, [groupedMatches]);

    const handleReplaceAll = useCallback(() => {
        if (!query.trim()) return;

        let regex: RegExp;
        try {
            regex = useRegex
                ? new RegExp(query, caseSensitive ? "g" : "gi")
                : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
        } catch {
            return;
        }

        const replacements: { fileName: string; content: string }[] = [];
        for (const [fileName, file] of Object.entries(files)) {
            const newContent = file.content.replace(regex, replacement);
            if (newContent !== file.content) {
                replacements.push({ fileName, content: newContent });
            }
        }

        if (replacements.length > 0) {
            onReplaceAll(replacements);
        }
    }, [query, replacement, files, useRegex, caseSensitive, onReplaceAll]);

    const toggleFile = (fileName: string) => {
        setExpandedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(fileName)) next.delete(fileName);
            else next.add(fileName);
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="h-full bg-zinc-950 border-l border-zinc-800 flex flex-col w-80">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Search</span>
                    {matches.length > 0 && (
                        <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                            {matches.length} results
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Search Input */}
            <div className="px-3 py-2 space-y-2 border-b border-zinc-800">
                <div className="flex items-center gap-1">
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search..."
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                    />
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`px-1.5 py-1.5 rounded text-[10px] font-bold transition-colors ${
                            caseSensitive ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                        title="Case sensitive"
                    >
                        Aa
                    </button>
                    <button
                        onClick={() => setUseRegex(!useRegex)}
                        className={`px-1.5 py-1.5 rounded text-[10px] font-bold font-mono transition-colors ${
                            useRegex ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                        title="Use regex"
                    >
                        .*
                    </button>
                    <button
                        onClick={() => setShowReplace(!showReplace)}
                        className={`p-1.5 rounded transition-colors ${
                            showReplace ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                        }`}
                        title="Toggle replace"
                    >
                        <Replace className="w-3.5 h-3.5" />
                    </button>
                </div>

                {showReplace && (
                    <div className="flex items-center gap-1">
                        <input
                            value={replacement}
                            onChange={(e) => setReplacement(e.target.value)}
                            placeholder="Replace..."
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
                        />
                        <button
                            onClick={handleReplaceAll}
                            disabled={!query.trim() || matches.length === 0}
                            className="px-2 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded text-[10px] font-bold text-white transition-colors"
                        >
                            All
                        </button>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto">
                {query && matches.length === 0 ? (
                    <div className="px-3 py-8 text-center text-zinc-600 text-xs">
                        No results for &quot;{query}&quot;
                    </div>
                ) : (
                    Array.from(groupedMatches.entries()).map(([fileName, fileMatches]) => (
                        <div key={fileName}>
                            <button
                                onClick={() => toggleFile(fileName)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/50 transition-colors text-left"
                            >
                                {expandedFiles.has(fileName) ? (
                                    <ChevronDown className="w-3 h-3 text-zinc-500" />
                                ) : (
                                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                                )}
                                <FileCode className="w-3 h-3 text-zinc-500" />
                                <span className="text-xs font-semibold text-zinc-300">{fileName}</span>
                                <span className="text-[10px] text-zinc-600">{fileMatches.length}</span>
                            </button>

                            {expandedFiles.has(fileName) && (
                                <div className="pl-8">
                                    {fileMatches.map((m, i) => (
                                        <button
                                            key={`${m.line}-${m.column}-${i}`}
                                            onClick={() => onNavigate(m.fileName, m.line)}
                                            className="w-full text-left px-2 py-1 hover:bg-zinc-800/30 transition-colors group"
                                        >
                                            <span className="text-[10px] text-zinc-600 font-mono mr-2">
                                                {m.line}:
                                            </span>
                                            <span className="text-[11px] text-zinc-400 font-mono">
                                                {highlightMatch(m.lineContent.trim(), m.matchText)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function highlightMatch(text: string, match: string): React.ReactNode {
    const idx = text.toLowerCase().indexOf(match.toLowerCase());
    if (idx === -1) return text;

    const maxLen = 60;
    let start = Math.max(0, idx - 20);
    let end = Math.min(text.length, idx + match.length + 20);
    let slice = text.slice(start, end);
    if (start > 0) slice = "\u2026" + slice;
    if (end < text.length) slice = slice + "\u2026";

    const localIdx = slice.toLowerCase().indexOf(match.toLowerCase());
    if (localIdx === -1) return slice;

    return (
        <>
            {slice.slice(0, localIdx)}
            <span className="bg-amber-500/30 text-amber-300 rounded px-0.5">
                {slice.slice(localIdx, localIdx + match.length)}
            </span>
            {slice.slice(localIdx + match.length)}
        </>
    );
}
