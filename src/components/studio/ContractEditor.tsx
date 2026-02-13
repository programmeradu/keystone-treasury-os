import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, Play, Loader2 } from "lucide-react";

interface ContractEditorProps {
    files: Record<string, { content: string }>;
    onCompile: () => void;
    isCompiling: boolean;
}

export function ContractEditor({ files, onCompile, isCompiling }: ContractEditorProps) {
    // Filter for .rs files
    const contractFiles = Object.entries(files).filter(([name]) => name.endsWith(".rs"));
    const [activeFile, setActiveFile] = React.useState(contractFiles[0]?.[0] ?? "");

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
                <button
                    onClick={onCompile}
                    disabled={isCompiling}
                    className="flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 text-xs rounded hover:bg-emerald-600/30 transition-colors border border-emerald-600/50"
                >
                    {isCompiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                    BUILD
                </button>
            </div>

            {/* Editor content */}
            <ScrollArea className="flex-1 font-mono text-xs">
                <div className="p-4">
                    <pre>{files[activeFile]?.content}</pre>
                </div>
            </ScrollArea>
        </div>
    );
}
