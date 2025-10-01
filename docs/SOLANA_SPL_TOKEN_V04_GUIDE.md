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

### 2. createApproveInstruction → createApproveCheckedInstruction

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

**New (v0.4.x):**
```typescript
import { createApproveCheckedInstruction } from '@solana/spl-token';

const instruction = createApproveCheckedInstruction(
  tokenAccount,      // Source account
  mint,              // Token mint (NEW - required)
  delegate,          // Delegate
  owner,             // Owner
  amount,            // Amount (bigint)
  decimals,          // Decimals (NEW - required)
  multiSigners,      // Multi-signers
  programId          // Token program ID
);
```

**Why?**
The "Checked" version includes additional validation to ensure the token mint and decimals match, preventing errors from mismatched token parameters.

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

### Use "Checked" Instructions When Available

Always prefer the "Checked" versions of instructions:

- ✅ `createApproveCheckedInstruction` over `createApproveInstruction`
- ✅ `createTransferCheckedInstruction` over `createTransferInstruction`
- ✅ `createMintToCheckedInstruction` over `createMintToInstruction`

**Why?** Checked instructions validate decimals and mint address, preventing costly errors.

### Use Sync Functions for PDA Derivation

For functions that derive addresses (PDAs), use the synchronous versions:

- ✅ `getAssociatedTokenAddressSync()` - Synchronous
- ❌ `getAssociatedTokenAddress()` - Not available in v0.4.x

### Always Specify Decimals

Many v0.4.x functions require explicit decimals parameter:

```typescript
// Get decimals from mint info
const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

// Use in instruction
const instruction = createApproveCheckedInstruction(
  tokenAccount,
  mintPublicKey,
  delegate,
  owner,
  BigInt(amount),
  decimals,  // ← Required!
  []
);
```

---

## Complete Example: Token Delegation in v0.4.x

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  createApproveCheckedInstruction,
  TOKEN_PROGRAM_ID,
  getAccount
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

  // 2. Get token decimals
  const mintInfo = await connection.getParsedAccountInfo(tokenMint);
  const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

  // 3. Convert amount to smallest units
  const amountInSmallestUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));

  // 4. Create approve instruction (checked version)
  const approveInstruction = createApproveCheckedInstruction(
    tokenAccount,
    tokenMint,
    delegateWallet,
    ownerWallet,
    amountInSmallestUnits,
    decimals,
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
| Approve delegation | `createApproveInstruction()` | `createApproveCheckedInstruction()` |
| Transfer tokens | `createTransferInstruction()` | `createTransferCheckedInstruction()` ✅ |
| Mint tokens | `createMintToInstruction()` | `createMintToCheckedInstruction()` ✅ |
| Get account info | `getAccount()` | `getAccount()` ✅ |
| Get mint info | `getMint()` | `getMint()` ✅ |

✅ = Recommended for safety

---

## Troubleshooting

### Error: Module has no exported member 'getAssociatedTokenAddress'
**Solution:** Use `getAssociatedTokenAddressSync` instead

### Error: Module has no exported member 'createApproveInstruction'
**Solution:** Use `createApproveCheckedInstruction` instead

### Error: Too few arguments
**Solution:** Check if you're missing the `decimals` parameter in "Checked" instructions

### Error: Invalid mint
**Solution:** Make sure you're passing the token mint PublicKey to "Checked" instructions

---

## Additional Resources

- **Official Docs:** https://solana-labs.github.io/solana-program-library/token/js/
- **Source Code:** https://github.com/solana-labs/solana-program-library/tree/master/token/js
- **Migration Guide:** https://github.com/solana-labs/solana-program-library/blob/master/token/js/CHANGELOG.md

---

**Last Updated:** October 1, 2025  
**Package Version:** @solana/spl-token v0.4.14
