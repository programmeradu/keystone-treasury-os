# Wallet Integration - Quick Start Guide

## 5-Minute Setup

### 1. Wrap Your App with Wallet Adapter

```typescript
// app/layout.tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

export default function RootLayout() {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
  const wallets = [/* your wallet adapters */];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* your app */}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

### 2. Use the Wallet Hook in Your Component

```typescript
import { useWalletTransaction } from '@/hooks/use-wallet-transaction';
import { WalletSigningDialog } from '@/components/WalletSigningDialog';

function MyComponent() {
  const walletTx = useWalletTransaction();
  const [approval, setApproval] = useState(null);

  if (!walletTx.connected) {
    return <p>Connect your wallet to continue</p>;
  }

  return (
    <div>
      <p>Connected: {walletTx.publicKey?.toBase58().slice(0, 8)}...</p>
    </div>
  );
}
```

### 3. Build a Transaction

```typescript
const handleSwap = async () => {
  const { tx, estimatedFee } = await walletTx.buildSwapTransaction({
    inMint: "EPjFWdd5Au",      // USDC
    outMint: "So11111111",     // SOL
    amount: 100,
    slippage: 0.5
  });

  console.log(`Transaction will cost: ◎${estimatedFee}`);
  setTransaction(tx);
};
```

### 4. Request Approval

```typescript
const handleApproveClick = async () => {
  const approval = walletTx.requestApproval({
    type: "swap",
    description: "Swap 100 USDC for SOL",
    estimatedFee: 0.00125,
    riskLevel: "low"
  });

  setApproval({ ...approval, tx: transaction });
};
```

### 5. Sign & Submit

```typescript
const handleUserApprove = async () => {
  const result = await walletTx.signAndSend(
    approval.tx,
    approval.id
  );

  if (result.confirmed) {
    console.log("✅ Transaction confirmed:", result.signature);
  } else {
    console.error("❌ Transaction failed");
  }
};
```

## Common Operations

### Swap Tokens

```typescript
const { tx, estimatedFee } = await walletTx.buildSwapTransaction({
  inMint: "EPjFWdd5Au",   // USDC
  outMint: "So11111111",  // SOL (wrapped)
  amount: 100,            // 100 USDC
  slippage: 0.5,          // 0.5% max slippage
  userPublicKey: wallet.publicKey
});
```

**Supported Token Mints:**
- USDC: `EPjFWdd5Au`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenEst`
- SOL (wrapped): `So11111111111111111111111111111111111111112`
- COPE: `8HGyAAB1yoM1ttS7pnqYLuwVyYmMjdehFSNFWAoTbyc`

### Stake SOL

```typescript
const { tx, estimatedFee } = await walletTx.buildStakeTransaction({
  amount: 10,                                      // 10 SOL
  stakePool: "Stake11111111111111111111111111111111111111",
  userPublicKey: wallet.publicKey
});
```

### Track Transaction

```typescript
const status = await walletTx.getStatus(signature);
console.log(status); // { confirmed: true, confirmations: 30, ... }
```

## Using WalletSigningDialog

```typescript
<WalletSigningDialog
  isOpen={showDialog}
  approval={approvalRequest}
  tx={transaction}
  isLoading={isProcessing}
  onApprove={handleApprove}
  onReject={() => setShowDialog(false)}
/>
```

Shows:
- ✅ Transaction type
- ✅ Estimated fee
- ✅ Risk level with warnings
- ✅ Transaction details
- ✅ Approve/Reject buttons

## Error Handling

```typescript
try {
  const result = await walletTx.signAndSend(tx, approvalId);
} catch (error) {
  console.error(error.message);
  // Common errors:
  // "Insufficient SOL for gas fees"
  // "Token amount too small"
  // "Slippage exceeded"
  // "Wallet signature rejected"
  // "Transaction simulation failed"
}
```

## State & Hooks

```typescript
const {
  connected,        // boolean - wallet connected?
  publicKey,        // PublicKey | null
  loading,          // boolean - operation in progress?
  signing,          // boolean - waiting for wallet signature?
  error,            // string | null - last error message
  signature,        // string | null - last tx signature
  confirmed,        // boolean - last tx confirmed?
  estimatedFee,     // number | null - last estimated fee
  pendingApprovals, // ApprovalRequest[] - waiting for approval
  
  // Methods
  buildSwapTransaction,
  buildStakeTransaction,
  simulateTransaction,
  requestApproval,
  signAndSend,
  signBatch,        // Sign multiple transactions
  getStatus,
  reset,            // Clear state
  clearCache        // Clear transaction cache
} = useWalletTransaction();
```

## API Integration

### Execute Strategy with Wallet

```typescript
const response = await fetch('/api/agentic/execute-with-wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategy: 'swap_token',
    input: { inMint, outMint, amount },
    userPublicKey: wallet.publicKey.toBase58(),
    requiresApproval: true
  })
});

const result = await response.json();
// result: { approvalId, estimatedFee, riskLevel, ... }
```

### Fetch Pending Approvals

```typescript
const response = await fetch(
  `/api/agentic/execute-with-wallet?userPublicKey=${publicKey}`,
  { method: 'GET' }
);

const { approvals, count } = await response.json();
```

### Reject Approval

```typescript
await fetch(
  `/api/agentic/execute-with-wallet?approvalId=${approvalId}`,
  { method: 'DELETE' }
);
```

## Fee Calculation

```
Fee = (ComputeUnitsUsed / 1,000,000) × 0.00025 SOL per unit

Typical Costs:
• Simple transfer:     5,000 CU  = ◎0.00125
• Token swap:         50,000 CU  = ◎0.0125
• Stake/Yield:       100,000 CU  = ◎0.025
• Complex DeFi:      200,000+ CU = ◎0.05+
```

## Risk Levels

- **Low** ≤ 0.05 SOL, simple operations (swaps)
- **Medium** 0.05-0.1 SOL or complex operations (yield farming)
- **High** > 0.1 SOL or very complex operations

Risk determines warning level shown to user.

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/wallet/transaction-executor.ts` | Core wallet engine |
| `src/hooks/use-wallet-transaction.ts` | React hook wrapper |
| `src/components/WalletSigningDialog.tsx` | Approval UI |
| `src/lib/agents/enhanced-transaction-agent.ts` | Agent integration |
| `src/app/api/agentic/execute-with-wallet/route.ts` | API endpoints |
| `src/components/WalletIntegrationExample.tsx` | Complete example |

## Next Steps

1. **Integrate into your component:** Copy 5-minute setup above
2. **Test with devnet:** Use `https://api.devnet.solana.com`
3. **Add error handling:** Wrap operations in try/catch
4. **Show approval dialog:** Use WalletSigningDialog component
5. **Monitor transactions:** Use getStatus() to track

## Troubleshooting

**Wallet won't connect:**
- Ensure @solana/wallet-adapter-react is installed
- Check WalletProvider is wrapping your app
- Verify wallet adapters are configured

**Transaction fails:**
- Check estimated fee (may be too low)
- Verify token mints are correct
- Test with devnet first
- Check RPC endpoint availability

**Fee is too high:**
- Use priority = 0 to save gas
- Batch multiple transactions
- Combine operations where possible

**Approval expires:**
- 5-minute window per approval
- User must sign within window
- If expired, user restarts transaction

---

**Status:** ✅ PRODUCTION READY
