import { Connection, PublicKey } from "@solana/web3.js";
import { SquadsClient } from "../src/lib/squads";

// Mock Data
const MOCK_VAULT_ADDRESS = "BuP7kGKaP5kQvKjq9Qj7vK7vK7vK7vK7vK7vK7vK7vK";
const MOCK_SIGNATURES = Array.from({ length: 100 }, (_, i) => ({
    signature: `sig${i}`,
    slot: 1000 + i,
    err: null,
    memo: null,
    blockTime: Date.now() / 1000,
}));

const MOCK_TX_RESPONSE = {
    slot: 1000,
    transaction: {
        signatures: ["sig1"],
        message: {
            accountKeys: [{ pubkey: new PublicKey(MOCK_VAULT_ADDRESS), signer: true, writable: true }],
            instructions: [],
            recentBlockhash: "bh",
        },
    },
    meta: {
        err: null,
        fee: 5000,
        preBalances: [1000000000],
        postBalances: [999995000],
        innerInstructions: [],
        logMessages: [],
        preTokenBalances: [],
        postTokenBalances: [],
    },
    blockTime: Date.now() / 1000,
};

class MockConnection {
    public callCounts: Record<string, number> = {
        getAccountInfo: 0,
        getSignaturesForAddress: 0,
        getParsedTransaction: 0,
        getParsedTransactions: 0,
    };

    async getAccountInfo(publicKey: PublicKey) {
        this.callCounts.getAccountInfo++;
        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
            owner: new PublicKey("11111111111111111111111111111111"), // System program
            data: Buffer.from([]),
            executable: false,
            lamports: 1000000000,
        };
    }

    async getSignaturesForAddress(address: PublicKey, options?: any) {
        this.callCounts.getSignaturesForAddress++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return MOCK_SIGNATURES;
    }

    async getParsedTransaction(signature: string, options?: any) {
        this.callCounts.getParsedTransaction++;
        await new Promise(resolve => setTimeout(resolve, 20)); // 20ms latency per tx fetch
        return MOCK_TX_RESPONSE;
    }

    async getParsedTransactions(signatures: string[], options?: any) {
        this.callCounts.getParsedTransactions++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return signatures.map(() => MOCK_TX_RESPONSE);
    }
}

async function runBenchmark() {
    console.log("Starting Benchmark for SquadsClient.getRecentTransactions...");

    const mockConnection = new MockConnection() as unknown as Connection;
    const client = new SquadsClient(mockConnection, {});

    // Overwrite connection methods on the client instance directly to catch calls
    client.connection.getAccountInfo = mockConnection.getAccountInfo.bind(mockConnection);
    client.connection.getSignaturesForAddress = mockConnection.getSignaturesForAddress.bind(mockConnection);
    client.connection.getParsedTransaction = mockConnection.getParsedTransaction.bind(mockConnection);
    client.connection.getParsedTransactions = mockConnection.getParsedTransactions.bind(mockConnection);

    const start = performance.now();

    try {
        const txs = await client.getRecentTransactions(MOCK_VAULT_ADDRESS, 100);

        const end = performance.now();
        const duration = end - start;

        console.log("\n--- Benchmark Results ---");
        console.log(`Total Execution Time: ${duration.toFixed(2)}ms`);
        console.log(`Transactions Processed: ${txs.length}`);
        console.log("RPC Call Counts:", (mockConnection as any).callCounts);
    } catch (e) {
        console.error("Benchmark failed:", e);
    }
}

runBenchmark().catch(console.error);