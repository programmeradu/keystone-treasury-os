"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { PublicKey } from "@solana/web3.js";

interface VaultContextType {
    activeVault: string | null;
    setActiveVault: (address: string | null) => void;
    vaultBalance: number | null;
    vaultTokens: any[];
    vaultValue: number | null; // Total USD Value
    vaultChange24h: number | null; // Weighted 24h % change
    vaultConfig: { threshold: number; members: number } | null;
    proposals: any[];
    loading: boolean;
    refresh: () => Promise<void>;
    sqClient: SquadsClient | null;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const wallet = useWallet();

    // Default to a placeholder vault if none selected (for demo/onboarding)
    const [activeVault, setActiveVault] = useState<string | null>(null);
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [vaultValue, setVaultValue] = useState<number | null>(null);
    const [vaultChange24h, setVaultChange24h] = useState<number | null>(null);
    const [vaultConfig, setVaultConfig] = useState<{ threshold: number; members: number } | null>(null);
    const [vaultTokens, setVaultTokens] = useState<any[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const sqClient = useMemo(() => {
        if (!connection) return null;
        return new SquadsClient(connection, wallet);
    }, [connection, wallet]);

    const refresh = async () => {
        if (!sqClient || !activeVault) return;
        setLoading(true);
        try {
            // Execute fetches in parallel but safely handle individual failures
            const [balanceResult, tokensResult, proposalsResult, configResult] = await Promise.allSettled([
                sqClient.getVaultBalance(activeVault),
                sqClient.getVaultTokens(activeVault),
                sqClient.getProposals(activeVault),
                sqClient.getVault(activeVault)
            ]);

            // Handle Balance
            const balance = balanceResult.status === "fulfilled" ? balanceResult.value : 0;
            if (balanceResult.status === "rejected") {
                console.warn("Vault refresh warning: Failed to fetch balance", balanceResult.reason);
            }

            // Handle Tokens
            const rawTokens = tokensResult.status === "fulfilled" ? tokensResult.value : [];
            if (tokensResult.status === "rejected") {
                console.warn("Vault refresh warning: Failed to fetch tokens", tokensResult.reason);
            }

            // Handle Proposals
            const props = proposalsResult.status === "fulfilled" ? proposalsResult.value : [];
            if (proposalsResult.status === "rejected") {
                console.warn("Vault refresh warning: Failed to fetch proposals", proposalsResult.reason);
            }

            // Handle Vault Config (Multisig Info)
            // Logic handled later in the flow using configResult

            // Fetch Prices/Metadata for tokens we successfully retrieved
            const mints = [...new Set(rawTokens.map(t => t.mint))];
            const solMint = "So11111111111111111111111111111111111111112";
            if (!mints.includes(solMint)) mints.push(solMint);

            let metadata: Record<string, { price: number; symbol?: string; name?: string; logo?: string; change24h?: number }> = {};
            try {
                metadata = await sqClient.getTokenMetadata(mints);
            } catch (pricingError) {
                console.warn("Pricing/Metadata API failed:", pricingError);
            }

            // Unify SOL and WSOL
            const wsolAccount = rawTokens.find(t => t.mint === solMint);
            const nativeBalance = balance;
            const wsolBalance = wsolAccount ? wsolAccount.amount : 0;
            const totalSolBalance = nativeBalance + wsolBalance;

            const otherTokens = rawTokens.filter(t => t.mint !== solMint);

            // Enrich Tokens
            const enrichedTokens = otherTokens.map(t => {
                const meta = metadata[t.mint] || {};
                return {
                    ...t,
                    symbol: meta.symbol || "SPL",
                    name: meta.name || "Unknown Token",
                    logo: meta.logo,
                    price: meta.price || 0,
                    change24h: meta.change24h || 0,
                    value: t.amount * (meta.price || 0)
                };
            });

            // Unified SOL Entry

            // Handle Config
            if (configResult.status === "fulfilled" && configResult.value) {
                const multisig = configResult.value as any; // Cast to any to handle SDK type definition gaps
                // Squads V4 uses 'keys' for members
                const memberCount = multisig.keys ? multisig.keys.length : (multisig.members ? multisig.members.length : 1);

                setVaultConfig({
                    threshold: Number(multisig.threshold),
                    members: memberCount
                });
            } else {
                // Fallback if not a multisig (e.g. standard wallet)
                setVaultConfig({ threshold: 1, members: 1 });
            }

            const solMeta = metadata[solMint] || { symbol: "SOL", name: "Solana", price: 0, change24h: 0, logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" };
            const unifiedSolEntry = {
                mint: solMint,
                amount: totalSolBalance,
                decimals: 9,
                symbol: "SOL",
                name: "Solana",
                logo: solMeta.logo,
                price: solMeta.price || 0,
                change24h: solMeta.change24h || 0,
                value: totalSolBalance * (solMeta.price || 0)
            };

            const allTokens = [unifiedSolEntry, ...enrichedTokens];
            const totalValue = allTokens.reduce((acc, t) => acc + t.value, 0);

            // Calculate Weighted 24h Change
            let weightedChange = 0;
            if (totalValue > 0) {
                weightedChange = allTokens.reduce((acc, t) => {
                    const weight = t.value / totalValue;
                    return acc + (t.change24h * weight);
                }, 0);
            }

            setVaultBalance(balance);
            setVaultValue(totalValue);
            setVaultChange24h(weightedChange);
            setVaultTokens(allTokens);
            setProposals(props);
        } catch (err) {
            console.error("Critical Vault Refresh Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeVault && sqClient) {
            refresh();
        }
    }, [activeVault, sqClient]);

    return (
        <VaultContext.Provider value={{
            activeVault,
            setActiveVault,
            vaultBalance,
            vaultTokens,
            vaultValue,
            vaultChange24h,
            vaultConfig,
            proposals,
            loading,
            refresh,
            sqClient
        }}>
            {children}
        </VaultContext.Provider>
    );
}

export const useVault = () => {
    const context = useContext(VaultContext);
    if (!context) throw new Error("useVault must be used within a VaultProvider");
    return context;
};
