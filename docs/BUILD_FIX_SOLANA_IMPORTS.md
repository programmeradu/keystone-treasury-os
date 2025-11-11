# Build Fix: @solana/spl-token v0.4.x Compatibility

## Error #1: getAssociatedTokenAddress Not Found

**Build Error:**
```
Type error: Module '"@solana/spl-token"' has no exported member 'getAssociatedTokenAddress'.
```

**Root Cause:**
In @solana/spl-token v0.4.x, the function was renamed from async to sync:
- v0.3.x: `await getAssociatedTokenAddress()` (async)
- v0.4.x: `getAssociatedTokenAddressSync()` (synchronous)

**Fix Applied:**

```typescript
// BEFORE (v0.3.x style)
import { getAssociatedTokenAddress, ... } from '@solana/spl-token';
const account = await getAssociatedTokenAddress(mint, wallet);

// AFTER (v0.4.x)
import { getAssociatedTokenAddressSync, ... } from '@solana/spl-token';
const account = getAssociatedTokenAddressSync(mint, wallet); // No await!
```

**Files Modified:**
- `src/lib/solana-rpc.ts` (3 occurrences)
- `src/app/api/delegation/request/route.ts` (1 occurrence)

---

## Error #2: createApproveCheckedInstruction Not Found

**Build Error:**
```
Type error: Module '"@solana/spl-token"' has no exported member 'createApproveCheckedInstruction'.
```

**Root Cause:**
The JavaScript SDK v0.4.x does NOT have `createApproveCheckedInstruction`. This was a misunderstanding - the "Checked" variant exists in the Rust on-chain program (`spl_token::instruction::approve_checked`) but not in the JS SDK.

The correct function in v0.4.x JS SDK is simply `createApproveInstruction`.

**Fix Applied:**

```typescript
// WRONG (this function doesn't exist in JS SDK)
import { createApproveCheckedInstruction, ... } from '@solana/spl-token';
const instruction = createApproveCheckedInstruction(
  account,
  mint,      // ❌ Not needed
  delegate,
  owner,
  amount,
  decimals,  // ❌ Not needed
  signers,
  programId
);

// CORRECT (v0.4.x JS SDK)
import { createApproveInstruction, ... } from '@solana/spl-token';
const instruction = createApproveInstruction(
  account,    // Token account
  delegate,   // Delegate wallet
  owner,      // Owner wallet
  amount,     // Amount (bigint)
  signers,    // Multi-signers (usually [])
  programId   // TOKEN_PROGRAM_ID
);
```

**Key Differences:**
- ✅ Standard `createApproveInstruction` (no "Checked")
- ✅ NO mint parameter
- ✅ NO decimals parameter
- ✅ Simpler signature with 6 parameters instead of 8

**Files Modified:**
- `src/app/api/delegation/request/route.ts`

---

## Summary

Both errors stemmed from misunderstanding the v0.4.x API:

1. **getAssociatedTokenAddress** → **getAssociatedTokenAddressSync** (made synchronous)
2. ~~createApproveCheckedInstruction~~ → **createApproveInstruction** (Checked variant doesn't exist in JS SDK)

The v0.4.x JS SDK uses simpler function signatures than we initially thought. The "Checked" instructions exist in the Rust on-chain program for additional validation, but the JavaScript SDK abstracts this away.

## Additional Fixes Applied

### Error 2: createApproveInstruction Not Found

**Issue:**
```
Type error: Module '@solana/spl-token' has no exported member 'createApproveInstruction'.
```

**Root Cause:**
In `@solana/spl-token` v0.4.x, `createApproveInstruction` was replaced with `createApproveCheckedInstruction` which includes additional validation.

**Solution:**

**Before:**
```typescript
import { createApproveInstruction } from '@solana/spl-token';

const approveInstruction = createApproveInstruction(
  userTokenAccount,
  delegateWallet,
  userWallet,
  BigInt(amount),
  [],
  TOKEN_PROGRAM_ID
);
```

**After:**
```typescript
import { createApproveCheckedInstruction } from '@solana/spl-token';

const approveInstruction = createApproveCheckedInstruction(
  userTokenAccount,
  tokenMintPubkey,    // ← Additional parameter required
  delegateWallet,
  userWallet,
  BigInt(amount),
  decimals,           // ← Additional parameter required
  [],
  TOKEN_PROGRAM_ID
);
```

**Files Updated:**
- `src/app/api/delegation/request/route.ts`

**Commit:** `e5481444` - "fix: Use createApproveCheckedInstruction for @solana/spl-token v0.4.x"
