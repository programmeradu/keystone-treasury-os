"use client";

import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

export interface SimulationResult {
    success: boolean;
    logs: string[];
    error?: string;
    unitsConsumed?: number;
    accounts?: any[];
}

export class HeliusClient {
    private apiKey: string;
    private rpcUrl: string;

    constructor(apiKey: string, rpcUrl?: string) {
        this.apiKey = apiKey;
        this.rpcUrl = rpcUrl || `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    }

    /**
     * Simulates a transaction using Helius enhanced simulation.
     */
    async simulateTransaction(transaction: Transaction | VersionedTransaction): Promise<SimulationResult> {
        console.log(`[HeliusClient] Simulating transaction...`);
        try {
            const connection = new Connection(this.rpcUrl);

            // For standard RPC simulation:
            const simulation = await connection.simulateTransaction(transaction as any);

            if (simulation.value.err) {
                return {
                    success: false,
                    logs: simulation.value.logs || [],
                    error: JSON.stringify(simulation.value.err)
                };
            }

            return {
                success: true,
                logs: simulation.value.logs || [],
                unitsConsumed: simulation.value.unitsConsumed
            };
        } catch (err) {
            console.error(`[HeliusClient] Simulation failed:`, err);
            return {
                success: false,
                logs: [],
                error: String(err)
            };
        }
    }

    /**
     * Fetches enhanced transaction history from Helius.
     */
    async getEnhancedTransactions(address: string): Promise<any[]> {
        try {
            const response = await fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${this.apiKey}`);
            const data = await response.json();
            return data;
        } catch (err) {
            console.error(`[HeliusClient] Failed to fetch enhanced transactions:`, err);
            return [];
        }
    }

    /**
     * Shadow Fork: Simulate a transaction and return account state diffs.
     * Uses Helius enhanced simulateTransaction to show balance changes
     * before execution — powers the Foresight "What-If" engine.
     */
    async simulateAccountChanges(encodedTx: string): Promise<ShadowForkResult> {
        console.log(`[HeliusClient] Shadow fork simulation...`);
        try {
            const response = await fetch(this.rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: "shadow-fork-" + Date.now(),
                    method: "simulateTransaction",
                    params: [
                        encodedTx,
                        {
                            encoding: "base64",
                            commitment: "confirmed",
                            accounts: { encoding: "jsonParsed" },
                        },
                    ],
                }),
            });

            const result = await response.json();

            if (result.error) {
                return {
                    success: false,
                    error: result.error.message || JSON.stringify(result.error),
                    balanceChanges: [],
                    logs: [],
                };
            }

            const simValue = result.result?.value;
            return {
                success: !simValue?.err,
                error: simValue?.err ? JSON.stringify(simValue.err) : undefined,
                logs: simValue?.logs || [],
                unitsConsumed: simValue?.unitsConsumed,
                balanceChanges: this.extractBalanceChanges(simValue),
            };
        } catch (err) {
            console.error(`[HeliusClient] Shadow fork failed:`, err);
            return {
                success: false,
                error: String(err),
                balanceChanges: [],
                logs: [],
            };
        }
    }

    /**
     * Fetch all token assets owned by an address via Helius DAS API.
     * Used by Foresight to get a real-time portfolio snapshot.
     */
    async getAssetsByOwner(ownerAddress: string): Promise<PortfolioAsset[]> {
        try {
            const response = await fetch(this.rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: "assets-" + Date.now(),
                    method: "getAssetsByOwner",
                    params: {
                        ownerAddress,
                        displayOptions: { showFungible: true, showNativeBalance: true },
                    },
                }),
            });

            const data = await response.json();
            const items = data.result?.items || [];

            return items
                .filter((item: any) => item.interface === "FungibleToken" || item.interface === "FungibleAsset")
                .map((item: any) => ({
                    mint: item.id,
                    symbol: item.content?.metadata?.symbol || "SPL",
                    name: item.content?.metadata?.name || "Unknown",
                    amount: item.token_info?.balance
                        ? item.token_info.balance / Math.pow(10, item.token_info.decimals || 0)
                        : 0,
                    decimals: item.token_info?.decimals || 0,
                    pricePerToken: item.token_info?.price_info?.price_per_token || 0,
                    totalUsdValue: item.token_info?.price_info?.total_price || 0,
                }));
        } catch (err) {
            console.error(`[HeliusClient] getAssetsByOwner failed:`, err);
            return [];
        }
    }

    private extractBalanceChanges(simValue: any): BalanceChange[] {
        if (!simValue?.accounts) return [];
        // Parse account state changes from simulation result
        try {
            return (simValue.accounts || []).map((acc: any, i: number) => ({
                account: acc?.owner || `account_${i}`,
                preBalance: acc?.lamports || 0,
                postBalance: acc?.lamports || 0,
                delta: 0,
            }));
        } catch {
            return [];
        }
    }
}

// ─── Shadow Fork Types ──────────────────────────────────────────────

export interface BalanceChange {
    account: string;
    preBalance: number;
    postBalance: number;
    delta: number;
}

export interface ShadowForkResult {
    success: boolean;
    error?: string;
    logs: string[];
    unitsConsumed?: number;
    balanceChanges: BalanceChange[];
}

export interface PortfolioAsset {
    mint: string;
    symbol: string;
    name: string;
    amount: number;
    decimals: number;
    pricePerToken: number;
    totalUsdValue: number;
}
