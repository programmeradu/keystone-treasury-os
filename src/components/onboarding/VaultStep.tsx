"use client";

import React, { useEffect } from "react";
import { Wallet, ExternalLink, CheckCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export const VaultStep = ({ updateData }: StepProps) => {
    const { publicKey, connected } = useWallet();
    const { setVisible: openWalletModal } = useWalletModal();

    // Sync wallet address to onboarding data when connected
    useEffect(() => {
        if (connected && publicKey) {
            updateData({ walletAddress: publicKey.toBase58() });
        } else {
            updateData({ walletAddress: "" });
        }
    }, [connected, publicKey, updateData]);

    const shortWallet = publicKey ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}` : null;

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Connect Your Vault</h2>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                    Link a Solana wallet — your Squads vault or personal wallet
                </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
                {connected ? (
                    <div className="p-6 rounded-2xl bg-card border border-primary/30 shadow-[0_0_20px_var(--dashboard-accent-muted)] text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground uppercase">Wallet Connected</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{shortWallet}</p>
                        </div>
                        <a
                            href={`https://solscan.io/account/${publicKey?.toBase58()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1 justify-center hover:underline"
                        >
                            View on Solscan <ExternalLink size={10} />
                        </a>
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-foreground uppercase">No Wallet Connected</p>
                            <p className="text-xs text-muted-foreground mt-1">Connect to enable treasury operations</p>
                        </div>
                        <button
                            onClick={() => openWalletModal(true)}
                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                        >
                            Connect Wallet
                        </button>
                    </div>
                )}

                <p className="text-[9px] text-muted-foreground text-center">
                    You can skip this and connect later from Settings. A connected wallet is needed for signing transactions.
                </p>
            </div>
        </div>
    );
};
