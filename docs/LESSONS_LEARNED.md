# Lessons Learned: @solana/spl-token v0.4.x Migration

## Issue Summary

We encountered multiple build failures while migrating to `@solana/spl-token` v0.4.14, caused by misconceptions about the v0.4.x API.

---

## Key Discoveries

### 1. The "Checked" Instructions Don't Exist in JS SDK

**Misconception:**
We assumed that because the Rust on-chain Solana program has "Checked" instruction variants (like `approve_checked`, `transfer_checked`), the JavaScript SDK would also expose these as separate functions.

**Reality:**
The JavaScript SDK v0.4.x **does NOT** have separate "Checked" functions. Functions like:
- ❌ `createApproveCheckedInstruction` - Does NOT exist
- ❌ `createTransferCheckedInstruction` - Does NOT exist  
- ❌ `createMintToCheckedInstruction` - Does NOT exist

Instead, the JS SDK uses the standard instruction names:
- ✅ `createApproveInstruction`
- ✅ `createTransferInstruction`
- ✅ `createMintToInstruction`

**Why This Matters:**
The JavaScript SDK abstracts away the on-chain instruction details. While the Solana SPL Token program has both standard and "Checked" variants at the program level, the JS SDK provides a unified interface.

---

### 2. Function Signatures Are Simpler Than Expected

**Misconception:**
We thought v0.4.x would require additional parameters like `mint` and `decimals` for all token instructions.

**Reality:**
The v0.4.x JS SDK keeps function signatures simple:

```typescript
// createApproveInstruction signature (v0.4.x)
createApproveInstruction(
  account: PublicKey,      // Token account
  delegate: PublicKey,     // Delegate wallet
  owner: PublicKey,        // Owner wallet
  amount: number | bigint, // Amount
  multiSigners: Signer[],  // Multi-signers
  programId: PublicKey     // Token program ID
)
```

**No extra parameters needed!** The function doesn't require:
- ❌ Token mint address
- ❌ Token decimals
- ❌ Additional validation parameters

---

### 3. The Real v0.4.x Breaking Change

**What Actually Changed:**
The main breaking change from v0.3.x → v0.4.x was **making PDA derivation synchronous**:

```typescript
// v0.3.x (async)
const account = await getAssociatedTokenAddress(mint, wallet);

// v0.4.x (sync)
const account = getAssociatedTokenAddressSync(mint, wallet);
```

**Why It Changed:**
PDA (Program Derived Address) computation is deterministic and doesn't require network calls. Making it synchronous improves performance and simplifies code.

---

## Build Errors We Encountered

### Build Error #1
```
Type error: Module '"@solana/spl-token"' has no exported member 'getAssociatedTokenAddress'.
```

**Fix:** Use `getAssociatedTokenAddressSync` (synchronous, no await)

---

### Build Error #2
```
Type error: Module '"@solana/spl-token"' has no exported member 'createApproveCheckedInstruction'.
```

**Fix:** Use `createApproveInstruction` (no "Checked" variant exists in JS SDK)

---

## What We Got Right

✅ **Identified the package version correctly:** v0.4.14  
✅ **Recognized that breaking changes existed** between v0.3.x and v0.4.x  
✅ **Fixed the sync/async issue** with `getAssociatedTokenAddressSync`  

## What Led Us Astray

❌ **Assumed JS SDK mirrors Rust program instructions** - The JS SDK abstracts on-chain details  
❌ **Over-complicated the solution** - Looked for "Checked" variants that don't exist  
❌ **Didn't verify against actual package exports** - Should have checked node_modules earlier  

---

## Correct v0.4.x Patterns

### Token Approval (Delegation)

```typescript
import { 
  getAssociatedTokenAddressSync, 
  createApproveInstruction,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

// Get token account (sync)
const tokenAccount = getAssociatedTokenAddressSync(mint, owner);

// Create approval (simple signature)
const instruction = createApproveInstruction(
  tokenAccount,
  delegate,
  owner,
  BigInt(amount),
  [],
  TOKEN_PROGRAM_ID
);
```

### Token Transfer

```typescript
import { 
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';

const sourceAccount = getAssociatedTokenAddressSync(mint, source);
const destAccount = getAssociatedTokenAddressSync(mint, destination);

const instruction = createTransferInstruction(
  sourceAccount,
  destAccount,
  source,
  BigInt(amount),
  [],
  TOKEN_PROGRAM_ID
);
```

---

## Debugging Approach That Worked

1. **Read the actual error messages carefully** - They tell you exactly what's missing
2. **Search the actual repository** - Found real usage in solana-labs/solana-program-library
3. **Check test files** - The token-swap tests showed actual v0.4.x usage
4. **Simplify when stuck** - Went back to basic function names instead of "advanced" variants

---

## Key Takeaways

1. **Don't assume SDK mirrors on-chain instructions** - SDKs abstract complexity
2. **Verify against actual package code** - Check GitHub, npm, or node_modules
3. **Test files are documentation** - Real usage examples > documentation pages
4. **Simpler is often correct** - If a function seems over-complicated, you might be wrong
5. **Breaking changes are usually simplifications** - v0.4.x made things easier, not harder

---

## Resources That Helped

- ✅ GitHub search in `solana-labs/solana-program-library` repository
- ✅ Test files in `token-swap/js/test/main.test.ts`
- ✅ Actual error messages from Netlify build logs
- ❌ Official documentation (was unclear about JS SDK specifics)
- ❌ Generic Stack Overflow answers (often for older versions)

---

## Future Prevention

**Before assuming a function exists:**
1. Search the actual package repository
2. Look at test files for real usage
3. Check if it's a Rust vs JavaScript difference
4. Start with simple function names before looking for "advanced" variants

**When encountering build errors:**
1. Read the exact error message
2. Search the error in the package's GitHub issues
3. Look for test files that use the function
4. Verify the package version you're actually using

---

**Last Updated:** October 1, 2025  
**Package Version:** @solana/spl-token v0.4.14  
**Commits:**
- `5094c749` - Fixed getAssociatedTokenAddress → getAssociatedTokenAddressSync
- `e5481444` - Attempted (incorrect) createApproveCheckedInstruction fix
- `0f9f9469` - Correct fix using createApproveInstruction
- `335e6fde` - Documentation corrections
