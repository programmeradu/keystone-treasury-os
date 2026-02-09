"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    Zap,
    Users,
    Coins,
    X,
    ArrowUpRight,
    Trash2,
    RotateCcw,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    Pencil,
    Check,
} from "lucide-react";
import { useBroadcastEvent, useEventListener, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/lib/toast-notifications";
import {
    useDistributionFiles,
    parseDistributionFile,
    DistributionFile,
    DistributionEntry,
} from "@/lib/hooks/useDistributionFiles";

export function OperationsNexus() {
    const [dragActive, setDragActive] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [activeDistribution, setActiveDistribution] = useState<DistributionFile | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [showSaved, setShowSaved] = useState(true);

    // Naming flow: after parse, prompt user to name before saving
    const [pendingParse, setPendingParse] = useState<{ entries: DistributionEntry[]; sourceType: "csv" | "json"; fileName: string; detectedToken: string } | null>(null);
    const [nameInput, setNameInput] = useState("");

    // Inline rename in saved list
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameInput, setRenameInput] = useState("");
    const renameRef = useRef<HTMLInputElement>(null);

    const { files: savedFiles, saveFile, deleteFile, renameFile } = useDistributionFiles();

    const broadcast = useBroadcastEvent();
    const others = useOthers();
    const othersInModule = others.filter(other => (other.presence as any)?.module === "OPERATIONS");

    useEventListener(({ event }) => {
        if (event.type === "DISTRIBUTION_SAVED") {
            toast.info("A team member saved a new distribution file.");
        }
    });

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const processFile = async (file: File) => {
        setParsing(true);
        setParseErrors([]);
        setActiveDistribution(null);
        setPendingParse(null);

        try {
            const { entries, errors, sourceType, detectedToken } = await parseDistributionFile(file);

            if (errors.length > 0) setParseErrors(errors);

            if (entries.length === 0) {
                setParsing(false);
                toast.error("No valid entries found in file");
                return;
            }

            // Show naming prompt instead of saving immediately
            const baseName = file.name.replace(/\.(csv|json|txt)$/i, "");
            setNameInput(baseName);
            setPendingParse({ entries, sourceType, fileName: file.name, detectedToken });
            toast.success(`Parsed ${entries.length} recipients — name your distribution to save`);
        } catch (err: any) {
            toast.error("Failed to parse file", { description: err?.message });
            setParseErrors([err?.message || "Unknown error"]);
        } finally {
            setParsing(false);
        }
    };

    const confirmSave = () => {
        if (!pendingParse) return;
        const name = nameInput.trim() || pendingParse.fileName;
        const saved = saveFile(name, pendingParse.entries, pendingParse.sourceType);
        setActiveDistribution(saved);
        setPendingParse(null);
        setNameInput("");
        broadcast({ type: "DISTRIBUTION_SAVED", payload: { name, count: saved.recipientCount } });
        toast.success(`Saved "${name}" — ${saved.recipientCount} recipients`);
    };

    const loadSavedFile = (file: DistributionFile) => {
        setActiveDistribution(file);
        setParseErrors([]);
        setShowPreview(false);
        setPendingParse(null);
    };

    const clearActive = () => {
        setActiveDistribution(null);
        setParseErrors([]);
        setShowPreview(false);
        setPendingParse(null);
    };

    const handleDeleteSaved = (id: string, name: string) => {
        deleteFile(id);
        if (activeDistribution?.id === id) clearActive();
        toast.success(`Deleted "${name}"`);
    };

    const startRename = (file: DistributionFile) => {
        setRenamingId(file.id);
        setRenameInput(file.name);
        setTimeout(() => renameRef.current?.focus(), 50);
    };

    const confirmRename = () => {
        if (!renamingId) return;
        const trimmed = renameInput.trim();
        if (trimmed) {
            renameFile(renamingId, trimmed);
            // Update active if it's the same file
            if (activeDistribution?.id === renamingId) {
                setActiveDistribution(prev => prev ? { ...prev, name: trimmed } : null);
            }
        }
        setRenamingId(null);
        setRenameInput("");
    };

    const hasTokenColumn = activeDistribution?.entries.some(e => e.token);

    return (
        <div className="flex flex-col h-full gap-3 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-4 pt-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-primary">
                        <Zap size={14} />
                        <span className="text-xs font-semibold">
                            {activeDistribution
                                ? `${activeDistribution.recipientCount} recipients · ${activeDistribution.tokenSummary}`
                                : pendingParse
                                ? `${pendingParse.entries.length} parsed — name to save`
                                : "Drop a file to start"}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {othersInModule.map(u => (
                            <Avatar key={u.connectionId} className="h-7 w-7 ring-2 ring-background">
                                <AvatarImage src={u.info?.avatar} />
                                <AvatarFallback className="text-[9px]">{u.info?.name?.[0]}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                    {othersInModule.length > 0 && (
                        <span className="px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20 text-[9px] text-primary font-medium">
                            {othersInModule.length} here
                        </span>
                    )}
                </div>
            </div>

            {/* Main content — split layout */}
            <div className="flex-1 flex gap-3 px-4 pb-2 min-h-0 overflow-hidden">
                {/* LEFT: Upload / Naming / Active Preview */}
                <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {pendingParse ? (
                            /* ─── Naming step after parse ─── */
                            <motion.div
                                key="naming"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col items-center justify-center gap-4 p-8"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <FileText size={22} />
                                </div>
                                <div className="text-center">
                                    <p className="text-foreground font-semibold text-sm mb-1">
                                        {pendingParse.entries.length} recipients parsed
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {pendingParse.detectedToken !== "Token" ? `Token: ${pendingParse.detectedToken} · ` : ""}
                                        {pendingParse.sourceType.toUpperCase()} · {pendingParse.fileName}
                                    </p>
                                </div>

                                {parseErrors.length > 0 && (
                                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 w-full max-w-sm">
                                        <span className="text-[9px] text-destructive font-semibold">{parseErrors.length} rows skipped</span>
                                    </div>
                                )}

                                <div className="w-full max-w-sm">
                                    <label className="text-[9px] text-muted-foreground font-medium mb-1 block">Name this distribution</label>
                                    <input
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && confirmSave()}
                                        placeholder="e.g. Q1 Grants Airdrop"
                                        className="w-full h-9 px-3 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setPendingParse(null); setParseErrors([]); }}
                                        className="px-4 py-2 rounded-lg bg-muted border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSave}
                                        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        Save Distribution
                                    </button>
                                </div>
                            </motion.div>
                        ) : !activeDistribution ? (
                            /* ─── Upload zone ─── */
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col"
                            >
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    className={`flex-1 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 relative overflow-hidden
                                        ${dragActive
                                            ? "border-primary bg-primary/5 scale-[1.01]"
                                            : "border-border bg-card/30 hover:border-muted-foreground/30 hover:bg-card/50"
                                        }`}
                                >
                                    <div className="text-center z-10 flex flex-col items-center">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border transition-colors ${
                                            dragActive ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"
                                        }`}>
                                            <Upload size={24} />
                                        </div>

                                        <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">
                                            {parsing ? "Parsing..." : "Mass Distribution"}
                                        </h3>
                                        <p className="text-muted-foreground text-[11px] mb-2 max-w-sm leading-relaxed">
                                            Drop a CSV or JSON file with recipient addresses and amounts.
                                        </p>
                                        <p className="text-muted-foreground/60 text-[9px] mb-6 max-w-xs leading-relaxed">
                                            Token is auto-detected from your file. Add a &quot;token&quot; column for multi-token distributions.
                                        </p>

                                        <label className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-[11px] cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2">
                                            Select File <ArrowUpRight size={12} />
                                            <input
                                                type="file"
                                                accept=".csv,.json,.txt"
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            /* ─── Active distribution preview ─── */
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden"
                            >
                                {/* Active File Header */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <FileText size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-foreground font-semibold text-[11px] truncate">{activeDistribution.name}</h4>
                                            <span className="text-[9px] text-muted-foreground font-mono">
                                                {activeDistribution.sourceType.toUpperCase()} · {activeDistribution.recipientCount} recipients · {activeDistribution.tokenSummary}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={clearActive} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 shrink-0">
                                    {[
                                        { label: "Recipients", val: activeDistribution.recipientCount.toLocaleString(), icon: Users, color: "text-primary" },
                                        { label: "Total Amount", val: `${activeDistribution.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${activeDistribution.tokenSummary}`, icon: Coins, color: "text-foreground" },
                                        { label: "Est. Fee", val: `~${(activeDistribution.recipientCount * 0.000005).toFixed(4)} SOL`, icon: Zap, color: "text-orange-500" },
                                    ].map((s, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-card border border-border flex flex-col gap-1">
                                            <s.icon size={14} className={s.color} />
                                            <span className="text-[8px] font-medium text-muted-foreground">{s.label}</span>
                                            <span className="text-sm font-mono font-bold text-foreground truncate">{s.val}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Preview Table */}
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl border border-border">
                                    <button
                                        onClick={() => setShowPreview(!showPreview)}
                                        className="flex items-center justify-between px-3 py-2 bg-card text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0 border-b border-border"
                                    >
                                        <span>Preview Recipients ({activeDistribution.recipientCount})</span>
                                        {showPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    {showPreview && (
                                        <div className="flex-1 overflow-auto scrollbar-thin">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-card z-10">
                                                    <tr className="text-[8px] uppercase tracking-wider text-muted-foreground border-b border-border">
                                                        <th className="py-2 pl-3 font-normal">#</th>
                                                        <th className="py-2 font-normal">Address</th>
                                                        <th className="py-2 font-normal">Amount</th>
                                                        {hasTokenColumn && <th className="py-2 font-normal">Token</th>}
                                                        {activeDistribution.entries[0]?.label && <th className="py-2 font-normal">Label</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[10px] font-mono text-muted-foreground">
                                                    {activeDistribution.entries.map((entry: DistributionEntry, i: number) => (
                                                        <tr key={i} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                                                            <td className="py-1.5 pl-3 text-muted-foreground/50">{i + 1}</td>
                                                            <td className="py-1.5">
                                                                <span className="text-foreground">{entry.address.slice(0, 8)}...{entry.address.slice(-4)}</span>
                                                            </td>
                                                            <td className="py-1.5 font-bold text-foreground">
                                                                {entry.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                                            </td>
                                                            {hasTokenColumn && (
                                                                <td className="py-1.5">
                                                                    <span className="px-1.5 py-0.5 rounded bg-muted text-[8px] font-bold text-muted-foreground">{entry.token || "—"}</span>
                                                                </td>
                                                            )}
                                                            {entry.label && <td className="py-1.5 text-muted-foreground">{entry.label}</td>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Execute */}
                                <button
                                    onClick={() => toast.info("Distribution execution requires a connected multisig wallet.")}
                                    className="w-full py-3 bg-primary text-primary-foreground font-semibold text-[11px] rounded-xl hover:opacity-90 transition-opacity shrink-0"
                                >
                                    Execute Distribution
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* RIGHT: Saved Distributions */}
                <div className="w-64 flex flex-col border border-border rounded-xl overflow-hidden shrink-0">
                    <button
                        onClick={() => setShowSaved(!showSaved)}
                        className="flex items-center justify-between px-3 py-2.5 bg-card text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors border-b border-border shrink-0"
                    >
                        <span className="flex items-center gap-2">
                            <Clock size={12} />
                            Distributions ({savedFiles.length})
                        </span>
                        {showSaved ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    {showSaved && (
                        <div className="flex-1 overflow-auto scrollbar-thin p-2">
                            {savedFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-2">
                                    <FileText size={20} className="text-muted-foreground/50" />
                                    <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
                                        No saved distributions yet.<br />Upload a file to get started.
                                    </p>
                                </div>
                            ) : (
                                savedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className={`p-2.5 rounded-lg mb-1.5 border transition-colors cursor-pointer group ${
                                            activeDistribution?.id === file.id
                                                ? "bg-primary/10 border-primary/20"
                                                : "bg-card/50 border-border hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-1.5 mb-1">
                                            <div className="min-w-0 flex-1" onClick={() => loadSavedFile(file)}>
                                                {renamingId === file.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            ref={renameRef}
                                                            value={renameInput}
                                                            onChange={(e) => setRenameInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") confirmRename();
                                                                if (e.key === "Escape") { setRenamingId(null); setRenameInput(""); }
                                                            }}
                                                            onBlur={confirmRename}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-full h-5 px-1 rounded bg-muted border border-primary/30 text-[10px] text-foreground focus:outline-none"
                                                        />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); confirmRename(); }}
                                                            className="p-0.5 text-primary"
                                                        >
                                                            <Check size={10} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] font-semibold text-foreground truncate">{file.name}</p>
                                                )}
                                                <p className="text-[8px] text-muted-foreground font-mono mt-0.5">
                                                    {file.recipientCount} recipients · {file.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {file.tokenSummary}
                                                </p>
                                            </div>
                                            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startRename(file); }}
                                                    title="Rename"
                                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    <Pencil size={9} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); loadSavedFile(file); }}
                                                    title="Load"
                                                    className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <RotateCcw size={9} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSaved(file.id, file.name); }}
                                                    title="Delete"
                                                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 size={9} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[7px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{file.sourceType.toUpperCase()}</span>
                                            {file.tokenSummary !== "Token" && (
                                                <span className="text-[7px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{file.tokenSummary}</span>
                                            )}
                                            <span className="text-[7px] text-muted-foreground/50 ml-auto">
                                                {new Date(file.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
