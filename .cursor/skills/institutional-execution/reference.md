# Institutional Execution — Reference

## simulateTransaction (Helius)

Use Helius RPC for simulation. Endpoint: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY` (or mainnet-fork if configured).

```ts
import { Connection } from "@solana/web3.js";

const connection = new Connection(HELIUS_RPC_URL);

const result = await connection.simulateTransaction(versionedTx, {
  sigVerify: false,
  replaceRecentBlockhash: true,
  commitment: "confirmed",
});

if (result.value.err) {
  throw new Error(`Simulation failed: ${JSON.stringify(result.value.err)}`);
}
// Proceed only if result.value.err is null
```

## VersionedTransaction

```ts
import {
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
} from "@solana/web3.js";

const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

const messageV0 = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash: blockhash,
  instructions: [...],
}).compileToV0Message(lookupTableAccounts); // optional ALTs

const versionedTx = new VersionedTransaction(messageV0);
versionedTx.sign([payer]);
```

## Squads v4 — Create Proposal + Vault Transaction

```ts
import * as multisig from "@sqds/multisig";

// Get instructions from multisig SDK
const createProposalIx = multisig.instructions.proposalCreate({ ... });
const createVaultTxIx = multisig.instructions.vaultTransactionCreate({
  multisigPda,
  transactionIndex,
  ephemeralSigners: 0,
  transactionMessage: versionedTx.message,
  memo: "Treasury swap: USDC -> SOL",
});

// Build VersionedTransaction with these instructions
// Then simulate, then execute
```

## Asset Delta Type

```ts
export interface AssetDelta {
  mint: string;
  owner: string;
  before: { raw: bigint; ui: number };
  after: { raw: bigint; ui: number };
  delta: { raw: bigint; ui: number };
}

export interface ExecutionResult {
  signature?: string;
  assetDeltas: AssetDelta[];
  simulationLogs?: string[];
}
```

## Recommended Flow

1. Build `VersionedTransaction` (or raw instructions for Squads).
2. Call `connection.simulateTransaction(tx)`.
3. If `result.value.err` is non-null, throw and do not execute.
4. Compute `AssetDelta[]` from simulation or pre-fetch balances.
5. Return or display deltas to the caller.
6. For DAO treasuries: wrap in Squads proposal; execute only after multisig approval.
