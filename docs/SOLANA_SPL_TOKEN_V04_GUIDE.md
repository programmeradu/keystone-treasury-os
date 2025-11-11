# @solana/spl-token v0.4.x API Reference

## Common Migration Issues from v0.3.x to v0.4.x

This document outlines the key differences when migrating from older versions of `@solana/spl-token` to version 0.4.x (we use v0.4.14).

## Breaking Changes

### 1. getAssociatedTokenAddress → getAssociatedTokenAddressSync

**Old (v0.3.x):**
```typescript
import { getAssociatedTokenAddress } from '@solana/spl-token';

// Async call - returns Promise<PublicKey>
const tokenAccount = await getAssociatedTokenAddress(
  mintPublicKey,
  walletPublicKey
);
```

**New (v0.4.x):**
```typescript
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

// Synchronous call - returns PublicKey directly
const tokenAccount = getAssociatedTokenAddressSync(
  mintPublicKey,
  walletPublicKey
);
```

**Why?** 
The function doesn't actually need to be async since it's just computing a PDA (Program Derived Address) deterministically. Making it synchronous improves performance.

---

### 2. createApproveInstruction (No "Checked" in JS SDK!)

**Old (v0.3.x):**
```typescript
import { createApproveInstruction } from '@solana/spl-token';

const instruction = createApproveInstruction(
  tokenAccount,      // Source account
  delegate,          // Delegate
  owner,             // Owner
  amount,            // Amount (bigint)
  multiSigners,      // Multi-signers
  programId          // Token program ID
);
```

**New (v0.4.x - SAME FUNCTION NAME!):**
```typescript
import { createApproveInstruction } from '@solana/spl-token';

const instruction = createApproveInstruction(
  tokenAccount,      // Source account
  delegate,          // Delegate
  owner,             // Owner
  amount,            // Amount (bigint)
  multiSigners,      // Multi-signers
  programId          // Token program ID
);
```

**Important Note:**
Despite what you might expect, **there is NO `createApproveCheckedInstruction` in the JavaScript SDK v0.4.x**. The function name remains `createApproveInstruction` and the signature is the same.

The "Checked" variant (`approve_checked`) exists in the **Rust on-chain program** for additional validation, but the JavaScript SDK does NOT expose a separate function for it. The JS SDK uses the standard approve instruction.

**Why?**
The JavaScript SDK abstracts away the on-chain instruction details. While the Solana program has both `Approve` and `ApproveChecked` instructions, the JS SDK provides a single interface that works for both.

---

### 3. Other Common Functions Still Available

These functions work the same in both versions:

```typescript
import {
  getAccount,              // ✅ Same API
  getMint,                 // ✅ Same API
  TOKEN_PROGRAM_ID,        // ✅ Same constant
  ASSOCIATED_TOKEN_PROGRAM_ID, // ✅ Same constant
  createTransferInstruction, // ✅ Same API (but createTransferCheckedInstruction recommended)
} from '@solana/spl-token';
```

---

## Best Practices for v0.4.x

### Use Standard Instructions

The v0.4.x JS SDK keeps things simple:

- ✅ `createApproveInstruction` - Standard approval (no "Checked" variant in JS SDK)
- ✅ `createTransferInstruction` - Standard transfer
- ✅ `createMintToInstruction` - Standard mint

**Note:** While the Rust on-chain program has "Checked" variants with additional validation, the JavaScript SDK v0.4.x abstracts this away and provides simpler function signatures.

### Use Sync Functions for PDA Derivation

For functions that derive addresses (PDAs), use the synchronous versions:

- ✅ `getAssociatedTokenAddressSync()` - Synchronous
- ❌ `getAssociatedTokenAddress()` - Not available in v0.4.x

### Always Get Decimals When Needed

For amount calculations, always fetch the token decimals:

```typescript
// Get decimals from mint info
const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

// Convert human-readable amount to smallest units
const amountInSmallestUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));
```

---

## Complete Example: Token Delegation in v0.4.x

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  createApproveInstruction,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

async function approveTokenDelegate(
  connection: Connection,
  ownerWallet: PublicKey,
  tokenMint: PublicKey,
  delegateWallet: PublicKey,
  amount: number
) {
  // 1. Get token account (synchronous)
  const tokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    ownerWallet
  );

  // 2. Get token decimals for amount conversion
  const mintInfo = await connection.getParsedAccountInfo(tokenMint);
  const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

  // 3. Convert amount to smallest units
  const amountInSmallestUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));

  // 4. Create approve instruction (standard v0.4.x)
  const approveInstruction = createApproveInstruction(
    tokenAccount,
    delegateWallet,
    ownerWallet,
    amountInSmallestUnits,
    [],
    TOKEN_PROGRAM_ID
  );

  return approveInstruction;
}
```

---

## Version Detection

If you need to support multiple versions, check which functions are available:

```typescript
import * as splToken from '@solana/spl-token';

// Check if v0.4.x
const isV04 = typeof splToken.getAssociatedTokenAddressSync !== 'undefined';

if (isV04) {
  // Use synchronous version
  const tokenAccount = splToken.getAssociatedTokenAddressSync(mint, wallet);
} else {
  // Use async version (v0.3.x)
  const tokenAccount = await splToken.getAssociatedTokenAddress(mint, wallet);
}
```

---

## Package Version

**Our Project Uses:**
```json
{
  "dependencies": {
    "@solana/spl-token": "^0.4.14"
  }
}
```

**Release Notes:** https://github.com/solana-labs/solana-program-library/releases

---

## Quick Reference Table

| Function | v0.3.x | v0.4.x |
|----------|--------|--------|
| Get token address | `await getAssociatedTokenAddress()` | `getAssociatedTokenAddressSync()` |
| Approve delegation | `createApproveInstruction()` | `createApproveInstruction()` ✅ |
| Transfer tokens | `createTransferInstruction()` | `createTransferInstruction()` ✅ |
| Mint tokens | `createMintToInstruction()` | `createMintToInstruction()` ✅ |
| Get account info | `getAccount()` | `getAccount()` ✅ |
| Get mint info | `getMint()` | `getMint()` ✅ |

✅ = Same API in both versions (or very similar)

---

## Troubleshooting

### Error: Module has no exported member 'getAssociatedTokenAddress'
**Solution:** Use `getAssociatedTokenAddressSync` instead (no await needed)

### Error: Module has no exported member 'createApproveCheckedInstruction'
**Solution:** Use `createApproveInstruction` - there is no "Checked" variant in the JS SDK v0.4.x

### Error: Too few arguments / Too many arguments
**Solution:** Check the function signature - v0.4.x uses simpler signatures than you might expect

---

## Additional Resources

- **Official Docs:** https://solana-labs.github.io/solana-program-library/token/js/
- **Source Code:** https://github.com/solana-labs/solana-program-library/tree/master/token/js
- **Migration Guide:** https://github.com/solana-labs/solana-program-library/blob/master/token/js/CHANGELOG.md

---

**Last Updated:** October 1, 2025  
**Package Version:** @solana/spl-token v0.4.14
