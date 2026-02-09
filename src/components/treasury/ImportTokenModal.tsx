"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { fetchTokenMetadata, type ImportedToken } from "@/lib/hooks/useImportedTokens";
import { toast } from "@/lib/toast-notifications";

interface ImportTokenModalProps {
    open: boolean;
    onClose: () => void;
    onImport: (token: ImportedToken) => void;
    existingMints: string[]; // already imported or in vault
}

type LookupState = "idle" | "loading" | "found" | "not-found" | "already-exists";

export function ImportTokenModal({ open, onClose, onImport, existingMints }: ImportTokenModalProps) {
    const [mintInput, setMintInput] = useState("");
    const [lookupState, setLookupState] = useState<LookupState>("idle");
    const [preview, setPreview] = useState<Omit<ImportedToken, "addedAt"> | null>(null);

    const reset = () => {
        setMintInput("");
        setLookupState("idle");
        setPreview(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleLookup = useCallback(async () => {
        const mint = mintInput.trim();
        if (mint.length < 32) {
            toast.error("Invalid mint address", { description: "Solana token mint addresses are 32-44 characters." });
            return;
        }

        if (existingMints.includes(mint)) {
            setLookupState("already-exists");
            return;
        }

        setLookupState("loading");
        setPreview(null);

        const meta = await fetchTokenMetadata(mint);

        if (meta) {
            setPreview(meta);
            setLookupState("found");
        } else {
            setLookupState("not-found");
        }
    }, [mintInput, existingMints]);

    const handleImport = () => {
        if (!preview) return;
        onImport({
            ...preview,
            addedAt: Date.now(),
        });
        toast.success(`Imported ${preview.symbol}`, { description: preview.name });
        handleClose();
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-md pointer-events-auto">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">Import Token</h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Add any SPL token by its mint address
                                    </p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-5">
                                {/* Mint Input */}
                                <div className="flex gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                                        <input
                                            autoFocus
                                            value={mintInput}
                                            onChange={(e) => {
                                                setMintInput(e.target.value);
                                                if (lookupState !== "idle") setLookupState("idle");
                                                setPreview(null);
                                            }}
                                            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                                            placeholder="Token mint address..."
                                            className="w-full h-10 bg-muted border border-border rounded-xl pl-9 pr-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                    <button
                                        onClick={handleLookup}
                                        disabled={!mintInput.trim() || lookupState === "loading"}
                                        className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                                    >
                                        {lookupState === "loading" ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            "Look up"
                                        )}
                                    </button>
                                </div>

                                {/* Preview / States */}
                                <AnimatePresence mode="wait">
                                    {lookupState === "loading" && (
                                        <motion.div
                                            key="loading"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex items-center justify-center gap-3 py-8"
                                        >
                                            <Loader2 size={18} className="animate-spin text-primary" />
                                            <span className="text-xs text-muted-foreground">Looking up token metadata...</span>
                                        </motion.div>
                                    )}

                                    {lookupState === "found" && preview && (
                                        <motion.div
                                            key="found"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col gap-4"
                                        >
                                            {/* Token Preview Card */}
                                            <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                                {preview.logo ? (
                                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                                                        <img
                                                            src={preview.logo}
                                                            alt={preview.symbol}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                                                        {preview.symbol.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm font-bold text-foreground">{preview.symbol}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate">{preview.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-mono text-muted-foreground/60 block mt-0.5 truncate">
                                                        {preview.mint}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground mt-0.5 block">
                                                        Decimals: {preview.decimals}
                                                    </span>
                                                </div>
                                                <CheckCircle2 size={20} className="text-primary shrink-0" />
                                            </div>

                                            {/* Import Button */}
                                            <button
                                                onClick={handleImport}
                                                className="w-full h-10 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={14} />
                                                Import {preview.symbol}
                                            </button>
                                        </motion.div>
                                    )}

                                    {lookupState === "not-found" && (
                                        <motion.div
                                            key="not-found"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center gap-3 py-6 text-center"
                                        >
                                            <AlertCircle size={24} className="text-destructive" />
                                            <div>
                                                <p className="text-xs font-medium text-foreground">Token not found</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed max-w-xs">
                                                    This mint address wasn't found in the Jupiter token registry.
                                                    Double-check the address and try again.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {lookupState === "already-exists" && (
                                        <motion.div
                                            key="exists"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center gap-3 py-6 text-center"
                                        >
                                            <CheckCircle2 size={24} className="text-primary" />
                                            <div>
                                                <p className="text-xs font-medium text-foreground">Already tracked</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    This token is already in your vault or imported list.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {lookupState === "idle" && (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center gap-2 py-6 text-center"
                                        >
                                            <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-xs">
                                                Paste a Solana token mint address above and click "Look up" to preview the token before importing.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

