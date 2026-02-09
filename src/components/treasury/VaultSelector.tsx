"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, ChevronDown, Unplug, ExternalLink, Copy, Check } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { toast } from "@/lib/toast-notifications";

export function VaultSelector() {
    const { activeVault, setActiveVault, disconnectVault, isMultisig, vaultConfig } = useVault();
    const [isOpen, setIsOpen] = useState(false);
    const [inputMode, setInputMode] = useState(false);
    const [address, setAddress] = useState("");
    const [copied, setCopied] = useState(false);

    const shortAddr = activeVault ? `${activeVault.slice(0, 6)}...${activeVault.slice(-4)}` : "";

    const handleConnect = () => {
        const trimmed = address.trim();
        if (trimmed.length < 32) {
            toast.error("Invalid address", { description: "Please enter a valid Solana address." });
            return;
        }
        setActiveVault(trimmed);
        setAddress("");
        setInputMode(false);
        setIsOpen(false);
    };

    const handleCopy = () => {
        if (!activeVault) return;
        navigator.clipboard.writeText(activeVault);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // No vault connected
    if (!activeVault) {
        return (
            <div className="relative mb-8">
                {!inputMode ? (
                    <button
                        onClick={() => setInputMode(true)}
                        className="w-full text-left p-4 rounded-2xl bg-muted/30 border border-dashed border-border hover:border-primary/30 hover:bg-muted/50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                <Eye size={20} />
                            </div>
                            <div className="flex-1 flex flex-col min-w-0">
                                <span className="text-[10px] font-medium text-muted-foreground mb-0.5">No address connected</span>
                                <span className="text-xs font-semibold text-foreground">Connect an address</span>
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="p-4 rounded-2xl bg-card border border-border shadow-lg">
                        <span className="text-[10px] font-medium text-muted-foreground mb-2 block">Paste a Solana address</span>
                        <input
                            autoFocus
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                            placeholder="Wallet or multisig address..."
                            className="w-full h-9 bg-muted border border-border rounded-lg px-3 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors mb-2"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleConnect}
                                disabled={!address.trim()}
                                className="flex-1 h-8 bg-primary text-primary-foreground rounded-lg text-[10px] font-semibold hover:opacity-90 transition-all disabled:opacity-30"
                            >
                                Connect
                            </button>
                            <button
                                onClick={() => { setInputMode(false); setAddress(""); }}
                                className="h-8 px-3 rounded-lg border border-border text-[10px] font-medium text-muted-foreground hover:bg-muted transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Vault connected — show status
    return (
        <div className="relative mb-8">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-card border border-primary/20 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm"
            >
                <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                        isMultisig ? "bg-primary/10 border border-primary/30 text-primary" : "bg-muted border border-border text-muted-foreground"
                    }`}>
                        {isMultisig ? <Shield size={20} /> : <Eye size={20} />}
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-[10px] font-medium text-muted-foreground mb-0.5">
                            {isMultisig ? `Squads multisig${vaultConfig ? ` · ${vaultConfig.threshold}/${vaultConfig.members}` : ""}` : "Standard wallet · Observer"}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground font-mono truncate">{shortAddr}</span>
                            <ChevronDown size={14} className={`text-muted-foreground/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 p-3 rounded-2xl bg-background/95 backdrop-blur-xl border border-border z-50 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                    >
                        <div className="flex flex-col gap-2">
                            {/* Copy Address */}
                            <button
                                onClick={handleCopy}
                                className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
                            >
                                {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
                                <span className="text-[11px] font-medium text-muted-foreground">{copied ? "Copied!" : "Copy address"}</span>
                            </button>

                            {/* View on Explorer */}
                            <button
                                onClick={() => window.open(`https://explorer.solana.com/address/${activeVault}`, "_blank")}
                                className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
                            >
                                <ExternalLink size={14} className="text-muted-foreground" />
                                <span className="text-[11px] font-medium text-muted-foreground">View on Explorer</span>
                            </button>

                            {/* View on Squads (only for multisig) */}
                            {isMultisig && (
                                <button
                                    onClick={() => window.open(`https://app.squads.so/squads/${activeVault}`, "_blank")}
                                    className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
                                >
                                    <ExternalLink size={14} className="text-muted-foreground" />
                                    <span className="text-[11px] font-medium text-muted-foreground">View on Squads</span>
                                </button>
                            )}

                            <div className="h-px bg-border my-1" />

                            {/* Switch Address */}
                            <button
                                onClick={() => { setInputMode(true); setIsOpen(false); disconnectVault(); }}
                                className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-muted transition-colors"
                            >
                                <Unplug size={14} className="text-muted-foreground" />
                                <span className="text-[11px] font-medium text-muted-foreground">Switch address</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
