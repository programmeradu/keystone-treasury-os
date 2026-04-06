"use client";

/**
 * DiffReview — Side-by-side diff view for AI-generated changes.
 *
 * Uses Monaco DiffEditor to show before/after changes from the AI Architect.
 * User can Accept, Reject, or Edit before applying.
 *
 * [P2] — Diff View for AI Changes
 */

import React, { useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import { loader } from "@monaco-editor/react";

interface DiffReviewProps {
    fileName: string;
    originalCode: string;
    modifiedCode: string;
    language: string;
    onAccept: (code: string) => void;
    onReject: () => void;
    isOpen: boolean;
}

export function DiffReview({
    fileName,
    originalCode,
    modifiedCode,
    language,
    onAccept,
    onReject,
    isOpen,
}: DiffReviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        let disposed = false;

        loader.init().then((monaco) => {
            if (disposed || !containerRef.current) return;

            const originalModel = monaco.editor.createModel(originalCode, language === "typescript" ? "typescript" : language);
            const modifiedModel = monaco.editor.createModel(modifiedCode, language === "typescript" ? "typescript" : language);

            const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
                readOnly: false,
                renderSideBySide: true,
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineNumbers: "on",
                theme: "vs-dark",
                renderOverviewRuler: false,
                diffWordWrap: "on",
            });

            diffEditor.setModel({
                original: originalModel,
                modified: modifiedModel,
            });

            editorRef.current = { diffEditor, originalModel, modifiedModel };
        });

        return () => {
            disposed = true;
            if (editorRef.current) {
                editorRef.current.diffEditor?.dispose();
                editorRef.current.originalModel?.dispose();
                editorRef.current.modifiedModel?.dispose();
                editorRef.current = null;
            }
        };
    }, [isOpen, originalCode, modifiedCode, language]);

    if (!isOpen) return null;

    const handleAccept = () => {
        // Get the modified content (user may have edited it)
        const modifiedContent = editorRef.current?.modifiedModel?.getValue() || modifiedCode;
        onAccept(modifiedContent);
    };

    return (
        <div className="absolute inset-0 z-40 bg-[#1e1e1e] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                        Review Changes
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">{fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onReject}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-400 font-bold transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Reject
                    </button>
                    <button
                        onClick={handleAccept}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs text-white font-bold transition-colors"
                    >
                        <Check className="w-3.5 h-3.5" />
                        Accept Changes
                    </button>
                </div>
            </div>

            {/* Diff Editor */}
            <div ref={containerRef} className="flex-1" />

            {/* Footer */}
            <div className="px-4 py-1.5 bg-zinc-950 border-t border-zinc-800 text-[10px] text-zinc-600 flex items-center justify-between">
                <span>
                    <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500 font-mono">Enter</kbd> Accept
                    {" \u00b7 "}
                    <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-500 font-mono">Esc</kbd> Reject
                    {" \u00b7 "}
                    You can edit the modified side before accepting
                </span>
                <span className="text-emerald-500/50">AI Architect Diff Review</span>
            </div>
        </div>
    );
}

/**
 * FileHistory — Manages file snapshots for undo/redo.
 * Stores snapshots before each AI edit, allows navigating history.
 */
export class FileHistory {
    private snapshots: Map<string, { content: string; timestamp: number; label: string }[]> = new Map();
    private maxSnapshots = 50;

    /**
     * Save a snapshot of a file before an AI edit.
     */
    saveSnapshot(fileName: string, content: string, label: string = "Before AI edit"): void {
        if (!this.snapshots.has(fileName)) {
            this.snapshots.set(fileName, []);
        }

        const history = this.snapshots.get(fileName)!;
        history.push({ content, timestamp: Date.now(), label });

        // Trim oldest snapshots
        if (history.length > this.maxSnapshots) {
            history.splice(0, history.length - this.maxSnapshots);
        }
    }

    /**
     * Get the most recent snapshot for a file (to show in diff view).
     */
    getLatestSnapshot(fileName: string): { content: string; timestamp: number; label: string } | null {
        const history = this.snapshots.get(fileName);
        if (!history || history.length === 0) return null;
        return history[history.length - 1];
    }

    /**
     * Get all snapshots for a file.
     */
    getHistory(fileName: string): { content: string; timestamp: number; label: string }[] {
        return this.snapshots.get(fileName) || [];
    }

    /**
     * Clear history for a file.
     */
    clearFile(fileName: string): void {
        this.snapshots.delete(fileName);
    }

    /**
     * Clear all history.
     */
    clearAll(): void {
        this.snapshots.clear();
    }
}
