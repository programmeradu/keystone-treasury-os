"use client";

import React, { useState } from "react";
import { Database, X, Loader2, Unplug } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { useNetwork } from "@/lib/contexts/NetworkContext";
import { toast } from "@/lib/toast-notifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function VaultStatusBar() {
    const { activeVault, setActiveVault, disconnectVault, vaultValue, loading, vaultTokens, isMultisig } = useVault();
    const { rpcHealth } = useNetwork();
    const [inputOpen, setInputOpen] = useState(false);
    const [address, setAddress] = useState("");

    const isConnected = !!activeVault && vaultTokens.length > 0;
    const isSyncing = !!activeVault && loading;
    const healthColor = rpcHealth === "ok" ? "bg-primary" : rpcHealth === "down" ? "bg-red-500" : "bg-yellow-500";
    const healthLabel = rpcHealth === "ok" ? "RPC Connected" : rpcHealth === "down" ? "RPC Offline" : "RPC Probing...";
    const shortAddr = activeVault ? `${activeVault.slice(0, 4)}...${activeVault.slice(-4)}` : "";

    const handleConnect = () => {
        const trimmed = address.trim();
        if (!trimmed) return;
        setActiveVault(trimmed);
        setAddress("");
        setInputOpen(false);
        toast.success("Vault synced", { description: `${trimmed.slice(0, 8)}... connected globally` });
    };

    const handleDisconnect = () => {
        disconnectVault();
        toast.info("Vault disconnected");
    };

    // Syncing state — vault address set but still loading data
    if (isSyncing && !isConnected) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className="group relative flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl transition-all duration-300 border border-primary/30 bg-primary/5 text-primary shrink-0"
                    >
                        <Loader2 size={18} className="animate-spin" />
                        <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${healthColor} border-2 border-background animate-pulse`} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <div className="text-left">
                        <p className="font-bold text-[11px]">Syncing vault...</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{activeVault?.slice(0, 8)}...</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${healthColor}`} />
                            <span className="text-[9px] text-muted-foreground/60">{healthLabel}</span>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }

    // Collapsed state — icon button in sidebar
    if (!inputOpen && !isConnected) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setInputOpen(true)}
                        className="group flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl transition-all duration-300 border border-dashed border-muted-foreground/20 bg-muted text-muted-foreground hover:bg-primary/20 hover:text-foreground hover:border-primary/30 shrink-0"
                    >
                        <Database size={18} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <div className="text-left">
                        <p className="font-bold text-[11px]">Connect Vault</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${healthColor}`} />
                            <span className="text-[9px] text-muted-foreground/60">{healthLabel}</span>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }

    // Input state — expanded overlay
    if (inputOpen && !isConnected) {
        return (
            <div className="absolute bottom-20 left-20 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold text-muted-foreground">Connect Address</span>
                    <button onClick={() => setInputOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                        <X size={12} className="text-muted-foreground" />
                    </button>
                </div>
                <input
                    autoFocus
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                    placeholder="Solana address (wallet or multisig)..."
                    className="w-full h-8 bg-muted border border-border rounded-lg px-3 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors mb-3"
                />
                <button
                    onClick={handleConnect}
                    disabled={!address.trim()}
                    className="w-full h-8 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
                >
                    Connect
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${healthColor}`} />
                    <span className="text-[9px] text-muted-foreground/50">{healthLabel}</span>
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-1 text-center">
                    Persists across all pages until disconnected
                </p>
            </div>
        );
    }

    // Connected state — green indicator with disconnect
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={handleDisconnect}
                    className="group relative flex flex-col items-center justify-center gap-1 w-11 h-11 rounded-xl transition-all duration-300 border border-primary/30 bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0"
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            <Database size={18} className="group-hover:hidden" />
                            <Unplug size={18} className="hidden group-hover:block" />
                        </>
                    )}
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">
                <div className="text-left">
                    <p className="font-bold text-[11px]">{shortAddr}</p>
                    <p className="text-[9px] text-muted-foreground/80 mt-0.5">{isMultisig ? "Squads multisig" : "Standard wallet"}</p>
                    {vaultValue != null && <p className="text-[10px] text-muted-foreground">${vaultValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${healthColor}`} />
                        <span className="text-[9px] text-muted-foreground/60">{healthLabel}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Click to disconnect</p>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
