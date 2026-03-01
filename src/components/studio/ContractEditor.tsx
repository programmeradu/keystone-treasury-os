"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ContractEditorProps {
    files: Record<string, { content: string }>;
    content?: string;
    onCompile: () => void;
    isCompiling: boolean;
}

interface CompileResult {
    ok: boolean;
    idl?: any;
    programId?: string;
    warnings?: string[];
    error?: string;
}

export function ContractEditor({ files, onCompile, isCompiling }: ContractEditorProps) {
    const [compileResult, setCompileResult] = React.useState<CompileResult | null>(null);
    const [useCloud, setUseCloud] = React.useState(true); // Default to cloud (no local toolchain needed)

    // Filter for .rs files
    const contractFiles = Object.entries(files).filter(([name]) => name.endsWith(".rs"));
    const [activeFile, setActiveFile] = React.useState(contractFiles[0]?.[0] ?? "");

    const handleCompile = async () => {
        setCompileResult(null);

        // Prepare files for the compile API
        const sourceFiles: Record<string, string> = {};
        for (const [name, file] of contractFiles) {
            sourceFiles[name] = file.content;
        }

        try {
            const res = await fetch("/api/studio/compile-contract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    files: sourceFiles,
                    programName: "keystone_app",
                    useCloud,
                }),
            });

            const result: CompileResult = await res.json();
            setCompileResult(result);

            // Also call the parent onCompile callback
            onCompile();
        } catch (err) {
            setCompileResult({
                ok: false,
                error: err instanceof Error ? err.message : "Compilation failed",
            });
        }
    };

    if (contractFiles.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 bg-[#09090b]">
                <FileCode className="w-12 h-12 mb-4 opacity-20" />
                <p>No Smart Contract generated yet.</p>
                <p className="text-xs mt-2 opacity-50">Ask the Architect to &quot;Build a Solana program&quot;</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-[#09090b] text-zinc-300">
            {/* Toolbar */}
            <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between">
                <div className="flex gap-2">
                    {contractFiles.map(([name]) => (
                        <button
                            key={name}
                            onClick={() => setActiveFile(name)}
                            className={`text-xs px-2 py-1 rounded ${activeFile === name ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/50 text-zinc-500'}`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {/* Cloud/Local toggle */}
                    <button
                        onClick={() => setUseCloud(!useCloud)}
                        className="text-[9px] px-2 py-1 rounded bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
                        title={useCloud ? "Using cloud compiler (no local toolchain needed)" : "Using local Anchor CLI"}
                    >
                        {useCloud ? "Cloud" : "Local"}
                    </button>
                    {/* Build button */}
                    <button
                        onClick={handleCompile}
                        disabled={isCompiling}
                        className="flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded hover:bg-emerald-600/30 transition-colors border border-emerald-600/50"
                    >
                        {isCompiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        BUILD
                    </button>
                </div>
            </div>

            {/* Compile Result Banner */}
            {compileResult && (
                <div className={`px-4 py-2 border-b text-xs flex items-center gap-2 ${compileResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                    {compileResult.ok ? (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Build successful</span>
                            {compileResult.idl && (
                                <span className="text-zinc-500 ml-2">
                                    IDL: {compileResult.idl.instructions?.length || 0} instructions
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="truncate">{compileResult.error}</span>
                        </>
                    )}
                    {compileResult.warnings?.map((w, i) => (
                        <span key={i} className="text-amber-400 text-[10px] ml-2">{w}</span>
                    ))}
                </div>
            )}

            {/* Editor content */}
            <ScrollArea className="flex-1 font-mono text-xs">
                <div className="p-4">
                    <pre>{files[activeFile]?.content}</pre>
                </div>
            </ScrollArea>
        </div>
    );
}
