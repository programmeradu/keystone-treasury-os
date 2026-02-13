"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { PublicKey } from "@solana/web3.js";
import { toast } from "@/lib/toast-notifications";
import { useImportedTokens } from "@/lib/hooks/useImportedTokens";

const STAKE_PROGRAM_ID = new PublicKey("Stake11111111111111111111111111111111111111");

export interface StakeAccountInfo {
    pubkey: string;
    lamports: number;        // total lamports in the account
    activeLamports: number;  // delegated stake amount
    rewardLamports: number;  // estimated unclaimed rewards (approximation)
    validator: string;       // vote account pubkey
    status: "active" | "activating" | "deactivating" | "inactive";
    activationEpoch: string;
    deactivationEpoch: string;
}

const VAULT_STORAGE_KEY = "keystone_active_vault";

interface VaultContextType {
    activeVault: string | null;
    setActiveVault: (address: string | null) => void;
    disconnectVault: () => void;
    vaultBalance: number | null;
    vaultTokens: any[];
    vaultValue: number | null; // Total USD Value (includes staked SOL)
    vaultChange24h: number | null; // Weighted 24h % change
    vaultConfig: { threshold: number; members: number } | null;
    proposals: any[];
    recentTransactions: any[];
    stakeAccounts: StakeAccountInfo[]; // native Solana stake accounts
    totalStakedSol: number; // total staked SOL (not lamports — already in SOL units)
    loading: boolean;
    refresh: () => Promise<void>;
    sqClient: SquadsClient | null;
    isMultisig: boolean; // true when connected address is a Squads multisig
    importedMints: string[]; // user-imported token mints that bypass spam filter
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
    const { connection } = useConnection();
    const wallet = useWallet();

    // Rehydrate from localStorage so vault persists across navigation + refresh
    const [activeVault, setActiveVaultRaw] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate once on mount (client-only)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(VAULT_STORAGE_KEY);
            if (stored) setActiveVaultRaw(stored);
        } catch {}
        setHydrated(true);
    }, []);

    // Persist-aware setter
    const setActiveVault = (address: string | null) => {
        setActiveVaultRaw(address);
        try {
            if (address) localStorage.setItem(VAULT_STORAGE_KEY, address);
            else localStorage.removeItem(VAULT_STORAGE_KEY);
        } catch {}
    };

    // Full disconnect — clears address + all cached data
    const disconnectVault = () => {
        setActiveVaultRaw(null);
        setVaultBalance(null);
        setVaultValue(null);
        setVaultChange24h(null);
        setVaultConfig(null);
        setVaultTokens([]);
        setProposals([]);
        setRecentTransactions([]);
        setStakeAccounts([]);
        setTotalStakedSol(0);
        setIsMultisig(false);
        try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch {}
    };
    const [vaultBalance, setVaultBalance] = useState<number | null>(null);
    const [vaultValue, setVaultValue] = useState<number | null>(null);
    const [vaultChange24h, setVaultChange24h] = useState<number | null>(null);
    const [vaultConfig, setVaultConfig] = useState<{ threshold: number; members: number } | null>(null);
    const [vaultTokens, setVaultTokens] = useState<any[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [stakeAccounts, setStakeAccounts] = useState<StakeAccountInfo[]>([]);
    const [totalStakedSol, setTotalStakedSol] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isMultisig, setIsMultisig] = useState(false);
    // Monotonic counter to guard against stale refresh results
    const refreshVersionRef = useRef(0);
    const { importedMints } = useImportedTokens();

    const sqClient = useMemo(() => {
        if (!connection) return null;
        return new SquadsClient(connection, wallet);
    }, [connection, wallet]);

    const refresh = async () => {
        if (!sqClient || !activeVault) return;
        const version = ++refreshVersionRef.current;
        setLoading(true);

        const rpcEndpoint = (connection as any)?._rpcEndpoint || "unknown";
        console.log(`[VaultSync] Starting sync v${version} for ${activeVault}`);
        console.log(`[VaultSync] RPC endpoint: ${rpcEndpoint}`);

        const errors: string[] = [];

        try {
            // Execute fetches in parallel but safely handle individual failures
            const [balanceResult, tokensResult, proposalsResult, configResult, txResult, stakeResult] = await Promise.allSettled([
                sqClient.getVaultBalance(activeVault),
                sqClient.getVaultTokens(activeVault),
                sqClient.getProposals(activeVault),
                sqClient.getVault(activeVault),
                sqClient.getRecentTransactions(activeVault, 50),
                // Fetch native stake accounts (delegated SOL)
                (async () => {
                    const vaultPubkey = new PublicKey(activeVault);
                    // Query stake accounts where this address is the withdrawer (most reliable authority)
                    const accounts = await connection.getParsedProgramAccounts(STAKE_PROGRAM_ID, {
                        filters: [
                            { dataSize: 200 }, // Stake account data is 200 bytes
                            { memcmp: { offset: 44, bytes: vaultPubkey.toBase58() } }, // authorized.withdrawer
                        ],
                    });

                    const parsed: StakeAccountInfo[] = [];
                    for (const acc of accounts) {
                        try {
                            const data = (acc.account.data as any)?.parsed;
                            if (!data?.info?.stake?.delegation) continue;

                            const delegation = data.info.stake.delegation;
                            const meta = data.info.meta;
                            const activeLamports = Number(delegation.stake) || 0;
                            const totalLamports = acc.account.lamports;
                            const rentExempt = Number(meta?.rentExemptReserve) || 0;
                            const deactivationEpoch = delegation.deactivationEpoch;

                            let status: StakeAccountInfo["status"] = "active";
                            if (deactivationEpoch !== "18446744073709551615") {
                                status = "deactivating";
                            }

                            parsed.push({
                                pubkey: acc.pubkey.toBase58(),
                                lamports: totalLamports,
                                activeLamports,
                                rewardLamports: Math.max(0, totalLamports - activeLamports - rentExempt),
                                validator: delegation.voter,
                                status,
                                activationEpoch: delegation.activationEpoch,
                                deactivationEpoch,
                            });
                        } catch {
                            // Skip malformed accounts
                        }
                    }
                    return parsed;
                })()
            ]);

            // Handle Balance
            const balance = balanceResult.status === "fulfilled" ? balanceResult.value : 0;
            if (balanceResult.status === "rejected") {
                const msg = `Balance fetch failed: ${balanceResult.reason?.message || balanceResult.reason}`;
                console.warn(`[VaultSync] ${msg}`);
                errors.push(msg);
            } else {
                console.log(`[VaultSync] SOL balance: ${balance}`);
            }

            // Handle Tokens
            const rawTokens = tokensResult.status === "fulfilled" ? tokensResult.value : [];
            if (tokensResult.status === "rejected") {
                const msg = `Token fetch failed: ${tokensResult.reason?.message || tokensResult.reason}`;
                console.warn(`[VaultSync] ${msg}`);
                errors.push(msg);
            } else {
                console.log(`[VaultSync] SPL tokens found: ${rawTokens.length}`, rawTokens.map(t => t.mint));
            }

            // Handle Proposals
            const props = proposalsResult.status === "fulfilled" ? proposalsResult.value : [];
            if (proposalsResult.status === "rejected") {
                console.warn(`[VaultSync] Proposals fetch failed (non-critical):`, proposalsResult.reason);
            }

            // Handle Recent Transactions
            const txs = txResult.status === "fulfilled" ? txResult.value : [];
            if (txResult.status === "rejected") {
                console.warn(`[VaultSync] Transactions fetch failed (non-critical):`, txResult.reason);
            } else {
                console.log(`[VaultSync] Recent transactions: ${txs.length}`);
            }
            setRecentTransactions(txs);

            // Handle Stake Accounts
            const stakeAccts = stakeResult.status === "fulfilled" ? stakeResult.value : [];
            if (stakeResult.status === "rejected") {
                console.warn(`[VaultSync] Stake accounts fetch failed (non-critical):`, stakeResult.reason);
            } else {
                const stakedSolTotal = stakeAccts.reduce((acc, s) => acc + s.activeLamports, 0) / 1e9;
                const rewardSolTotal = stakeAccts.reduce((acc, s) => acc + s.rewardLamports, 0) / 1e9;
                console.log(`[VaultSync] Stake accounts: ${stakeAccts.length}, staked: ${stakedSolTotal.toLocaleString()} SOL, rewards: ${rewardSolTotal.toLocaleString()} SOL`);
            }
            setStakeAccounts(stakeAccts);

            // Surface RPC errors to user
            if (errors.length > 0) {
                const isRateLimit = errors.some(e => /429|403|rate|limit|Too Many/i.test(e));
                toast.error(isRateLimit ? "RPC rate-limited" : "Vault sync partially failed", {
                    id: "vault-sync-error",
                    description: isRateLimit
                        ? "Public Solana RPC is rate-limited. Set NEXT_PUBLIC_SOLANA_RPC_URL in .env.local (Helius free tier recommended)."
                        : errors[0],
                    duration: 8000,
                });
            }

            // Fetch Prices/Metadata for tokens we successfully retrieved
            const mints = [...new Set(rawTokens.map(t => t.mint))];
            const solMint = "So11111111111111111111111111111111111111112";
            if (!mints.includes(solMint)) mints.push(solMint);

            console.log(`[VaultSync] Fetching metadata for ${mints.length} mints (DexScreener → Jupiter → well-known fallback)...`);
            let metadata: Record<string, { price: number; symbol?: string; name?: string; logo?: string; change24h?: number }> = {};
            try {
                metadata = await sqClient.getTokenMetadata(mints);
                console.log(`[VaultSync] Metadata received for:`, Object.keys(metadata));
                for (const [mint, meta] of Object.entries(metadata)) {
                    console.log(`[VaultSync]   ${meta.symbol || mint}: $${meta.price}`);
                }
            } catch (pricingError) {
                console.warn("[VaultSync] Pricing/Metadata API failed:", pricingError);
                toast.warning("Price data unavailable", { id: "vault-price-warn", description: "DexScreener API failed. Token values may show as $0." });
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

            // Handle Config — detect if this is a Squads multisig or a regular wallet
            if (configResult.status === "fulfilled" && configResult.value) {
                const multisig = configResult.value as any;
                const memberCount = multisig.keys ? multisig.keys.length : (multisig.members ? multisig.members.length : 1);

                setVaultConfig({
                    threshold: Number(multisig.threshold),
                    members: memberCount
                });
                setIsMultisig(true);
                console.log(`[VaultSync] Squads multisig detected — ${memberCount} members, threshold ${multisig.threshold}`);
            } else {
                // Regular wallet — no multisig config
                setVaultConfig(null);
                setIsMultisig(false);
                console.log(`[VaultSync] Standard wallet detected (not a Squads multisig)`);
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

            // Filter out truly unknown tokens: $0 value AND no recognized symbol/name
            // These are likely spam/airdrop tokens. Tokens with value OR recognized metadata are kept.
            // User-imported tokens always pass the filter.
            const importedSet = new Set(importedMints);
            const recognizedTokens = enrichedTokens.filter(t => {
                if (importedSet.has(t.mint)) return true;
                const hasValue = t.value > 0;
                const hasIdentity = t.symbol !== "SPL" && t.name !== "Unknown Token";
                return hasValue || hasIdentity;
            });

            // Calculate total staked SOL value
            const stakedLamportsTotal = stakeAccts.reduce((acc, s) => acc + s.lamports, 0);
            const stakedSolAmount = stakedLamportsTotal / 1e9;
            setTotalStakedSol(stakedSolAmount);
            const stakedSolValue = stakedSolAmount * (solMeta.price || 0);

            // If there are stake accounts, add a synthetic "Staked SOL" token entry
            const allTokens = [unifiedSolEntry, ...recognizedTokens];
            if (stakedSolAmount > 0) {
                allTokens.push({
                    mint: "STAKED_SOL_NATIVE",
                    amount: stakedSolAmount,
                    decimals: 9,
                    symbol: "Staked SOL",
                    name: `Native Staking (${stakeAccts.length} account${stakeAccts.length !== 1 ? "s" : ""})`,
                    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                    price: solMeta.price || 0,
                    change24h: solMeta.change24h || 0,
                    value: stakedSolValue,
                });
                console.log(`[VaultSync] Added Staked SOL entry: ${stakedSolAmount.toLocaleString()} SOL ($${stakedSolValue.toLocaleString()})`);
            }

            const totalValue = allTokens.reduce((acc, t) => acc + t.value, 0);

            // Calculate Weighted 24h Change
            let weightedChange = 0;
            if (totalValue > 0) {
                weightedChange = allTokens.reduce((acc, t) => {
                    const weight = t.value / totalValue;
                    return acc + (t.change24h * weight);
                }, 0);
            }

            // Guard: if a newer refresh started while we were awaiting, discard this result
            if (version !== refreshVersionRef.current) {
                console.log(`[VaultSync] v${version} discarded — superseded by v${refreshVersionRef.current}`);
                return;
            }

            setVaultBalance(balance);
            setVaultValue(totalValue);
            setVaultChange24h(weightedChange);
            setVaultTokens(allTokens);
            setProposals(props);
            // Log final state
            console.log(`[VaultSync] Final v${version}: ${allTokens.length} tokens, total value: $${totalValue.toFixed(2)}`);
            if (totalValue === 0 && balance === 0 && rawTokens.length === 0 && errors.length === 0) {
                toast.info("Vault appears empty", {
                    id: "vault-empty",
                    description: `No SOL balance or SPL tokens found at ${activeVault.slice(0, 8)}...`,
                });
            } else if (errors.length === 0 && totalValue > 0) {
                toast.success("Vault synced", {
                    id: "vault-synced",
                    description: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} across ${allTokens.filter(t => t.value > 0).length} assets`,
                });
            }
        } catch (err: any) {
            console.error("[VaultSync] Critical error:", err);
            toast.error("Vault sync failed", { id: "vault-sync-critical", description: err?.message || String(err) });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hydrated && activeVault && sqClient) {
            refresh();
        }
    }, [activeVault, sqClient, hydrated]);

    return (
        <VaultContext.Provider value={{
            activeVault,
            setActiveVault,
            disconnectVault,
            vaultBalance,
            vaultTokens,
            vaultValue,
            vaultChange24h,
            vaultConfig,
            proposals,
            loading,
            refresh,
            sqClient,
            isMultisig,
            importedMints,
            recentTransactions,
            stakeAccounts,
            totalStakedSol,
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
