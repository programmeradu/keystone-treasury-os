# Build Fix - @solana/spl-token Import Error

## Issue
Netlify deployment failed with TypeScript error:
```
Type error: Module '@solana/spl-token' has no exported member 'getAssociatedTokenAddress'.
```

## Root Cause
The project uses `@solana/spl-token` version `^0.4.14`, where the function `getAssociatedTokenAddress` was changed to `getAssociatedTokenAddressSync` (synchronous version).

## Solution Applied

### Files Modified:
1. **src/lib/solana-rpc.ts**
2. **src/app/api/delegation/request/route.ts**

### Changes Made:

**Before:**
```typescript
import { 
  getAssociatedTokenAddress,  // ❌ Not exported in v0.4.x
  getAccount,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

// Usage
const tokenAccount = await getAssociatedTokenAddress(
  mintPublicKey,
  walletPublicKey
);
```

**After:**
```typescript
import { 
  getAssociatedTokenAddressSync,  // ✅ Correct for v0.4.x
  getAccount,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

// Usage (no await needed - synchronous)
const tokenAccount = getAssociatedTokenAddressSync(
  mintPublicKey,
  walletPublicKey
);
```

## Locations Updated

### src/lib/solana-rpc.ts
- Line 15: Import statement
- Line 65: `getTokenBalance()` function
- Line 279: `tokenAccountExists()` function

### src/app/api/delegation/request/route.ts
- Line 12: Import statement
- Line 68: Token account lookup

## Verification

**Commit:** `5094c749` - "fix: Update @solana/spl-token imports for v0.4.x compatibility"

**Pushed to GitHub:** ✅ Yes

**Netlify Deployment:** 🔄 Building now

## Version Notes

The change from `getAssociatedTokenAddress` (async) to `getAssociatedTokenAddressSync` (sync) occurred between major versions of `@solana/spl-token`:

- **v0.3.x:** `getAssociatedTokenAddress` (async) - returns Promise
- **v0.4.x:** `getAssociatedTokenAddressSync` (sync) - returns PublicKey directly

Our project uses v0.4.14, so we use the synchronous version.

## Testing

After Netlify deployment succeeds, test these endpoints:

1. **Balance Check:**
   ```bash
   curl "https://keystone-treasury-os.netlify.app/api/test/balance?wallet=YOUR_WALLET"
   ```

2. **Delegation Request:**
   ```bash
   curl -X POST "https://keystone-treasury-os.netlify.app/api/delegation/request" \
     -H "Content-Type: application/json" \
     -d '{
       "walletAddress": "YOUR_WALLET",
       "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
       "amount": 100,
       "expiryDays": 30
     }'
   ```

## Status

- ✅ Error 1 identified (getAssociatedTokenAddress)
- ✅ Fix 1 applied (use getAssociatedTokenAddressSync)
- ✅ Error 2 identified (createApproveInstruction)
- ✅ Fix 2 applied (use createApproveCheckedInstruction)
- ✅ Code committed (commits: 5094c749, e5481444)
- ✅ Changes pushed
- 🔄 Netlify rebuilding
- ⏳ Verification pending

---

**Expected Result:** Build should complete successfully and all API endpoints should work correctly.

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
