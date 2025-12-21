"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ChevronDown, Check, Plus, Globe, Settings2 } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";

const AVAILABLE_VAULTS = [
    { name: "Keystone DAO Main", address: "8xJQ...f9h2", type: "Squads V4" },
    { name: "Security Council", address: "2kL9...p1a7", type: "Squads V4" },
    { name: "Grant Committee", address: "5mN3...wQ01", type: "Safe (Solana)" },
];

export function VaultSelector() {
    const { activeVault, setActiveVault } = useVault();
    const [isOpen, setIsOpen] = useState(false);

    const active = AVAILABLE_VAULTS.find(v => v.address === activeVault) || AVAILABLE_VAULTS[0];

    return (
        <div className="relative mb-8">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-card border border-primary/20 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm"
            >
                {/* Tactical Background Glow */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors" />

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                        <Shield size={20} />
                    </div>
                    <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Active_Multisig</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground uppercase truncate">{active.name}</span>
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
                        className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-background/95 backdrop-blur-xl border border-border z-50 shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                    >
                        <div className="flex flex-col gap-1">
                            {AVAILABLE_VAULTS.map((vault) => (
                                <button
                                    key={vault.address}
                                    onClick={() => {
                                        setActiveVault(vault.address);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full p-3 rounded-xl flex items-center justify-between group transition-colors ${activeVault === vault.address ? "bg-primary/10" : "hover:bg-muted"
                                        }`}
                                >
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className={`text-xs font-bold uppercase transition-colors ${activeVault === vault.address ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                            }`}>{vault.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-mono text-muted-foreground/30">{vault.address}</span>
                                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground/50 uppercase font-black">{vault.type}</span>
                                        </div>
                                    </div>
                                    {activeVault === vault.address && (
                                        <Check size={14} className="text-primary" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="h-px bg-border my-2" />

                        <button className="w-full p-3 rounded-xl flex items-center gap-3 text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all text-xs font-bold uppercase tracking-widest">
                            <Plus size={14} />
                            Deploy New Vault
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
