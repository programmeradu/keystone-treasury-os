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
}
