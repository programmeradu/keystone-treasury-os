"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, ChevronDown, Unplug, ExternalLink, Copy, Check } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { toast } from "@/lib/toast-notifications";
import { SquadsClient } from "@/lib/squads";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export function VaultSelector() {
    const { activeVault, setActiveVault, disconnectVault, isMultisig, vaultConfig } = useVault();
    const { connection } = useConnection();
    const wallet = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [inputMode, setInputMode] = useState(false);
    const [createMode, setCreateMode] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [address, setAddress] = useState("");
    const [copied, setCopied] = useState(false);

    const shortAddr = activeVault ? `${activeVault.slice(0, 6)}...${activeVault.slice(-4)}` : "";

    const handleCreateMultisig = async () => {
        if (!wallet.publicKey || !wallet.connected) {
            toast.error("Wallet disconnected", { description: "Connect your wallet first." });
            return;
        }

        try {
            setIsCreating(true);
            toast.loading("Deploying Squads V4 Vault...", { id: "create-multisig" });
            
            const client = new SquadsClient(connection, wallet);
            const { multisigPda } = await client.createMultisig({
                members: [{
                    key: wallet.publicKey,
                    // 3 = mask for all permissions (Initiate, Vote, Execute)
                    permissions: { mask: 3 }
                }],
                threshold: 1, // Start as 1/1, user can add members via Team page
            });

            toast.success("Squads Multisig Deployed!", {
                id: "create-multisig",
                description: `Created successfully: ${multisigPda.slice(0, 8)}...`
            });

            // Persist vault to database with tier enforcement
            try {
                const res = await fetch("/api/vault", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ address: multisigPda, isMultisig: true }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (res.status === 403 && (data.limit || data.error?.code === "VAULT_LIMIT_REACHED")) {
                        toast.error("Vault limit reached", {
                            description: data.error?.message || data.message || "Upgrade your plan to create more vaults.",
                        });
                        return;
                    }
                    console.warn("[VaultSelector] Failed to persist vault:", data);
                }
            } catch (persistErr) {
                console.warn("[VaultSelector] Could not persist vault to database:", persistErr);
            }

            // Connect to the new vault automatically
            setActiveVault(multisigPda);
            setCreateMode(false);
            
        } catch (error: any) {
            console.error(error);
            toast.error("Deployment failed", { 
                id: "create-multisig",
                description: error?.message || "Could not deploy multisig"
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleConnect = async () => {
        const trimmed = address.trim();
        if (trimmed.length < 32) {
            toast.error("Invalid address", { description: "Please enter a valid Solana address." });
            return;
        }

        // Persist to database (best-effort — don't block if it fails)
        try {
            const res = await fetch("/api/vault", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: trimmed, isMultisig: false }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 403 && data.limit) {
                    toast.error("Vault limit reached", {
                        description: data.message || "Upgrade your plan to add more vaults.",
                    });
                    return;
                }
                // 409 = already registered, that's fine — proceed
                if (res.status !== 409) {
                    console.warn("[VaultSelector] Failed to persist vault:", data);
                }
            }
        } catch (err) {
            console.warn("[VaultSelector] Could not persist vault:", err);
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
                {createMode ? (
                    <div className="p-4 rounded-2xl bg-card border border-primary/30 shadow-[0_0_15px_rgba(37,168,92,0.15)] flex flex-col items-center justify-center text-center">
                        <Shield className="w-10 h-10 text-primary mb-3" />
                        <h3 className="text-sm font-semibold text-foreground mb-1">Create a New Squads Vault</h3>
                        <p className="text-[11px] text-muted-foreground mb-4">Deploy a native Squads V4 multisig to the Solana blockchain. You will be set as the initial admin (1/1 threshold).</p>
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={handleCreateMultisig}
                                disabled={isCreating}
                                className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 relative"
                            >
                                {isCreating ? "Deploying..." : "Sign & Deploy"}
                            </button>
                            <button
                                onClick={() => setCreateMode(false)}
                                disabled={isCreating}
                                className="h-9 px-4 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : !inputMode ? (
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setCreateMode(true)}
                            className="text-left p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:border-primary/50 hover:bg-primary/15 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary mb-3">
                                <Shield size={16} />
                            </div>
                            <span className="text-[10px] font-medium text-primary mb-0.5 block">Launch new treasury</span>
                            <span className="text-xs font-semibold text-foreground block">Create Squad</span>
                        </button>

                        <button
                            onClick={() => setInputMode(true)}
                            className="text-left p-4 rounded-2xl bg-muted/30 border border-dashed border-border hover:border-foreground/30 hover:bg-muted/50 transition-all group"
                        >
                            <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3">
                                <Eye size={16} />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground mb-0.5 block">Existing multisig</span>
                            <span className="text-xs font-semibold text-foreground block">Connect Addr</span>
                        </button>
                    </div>
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
