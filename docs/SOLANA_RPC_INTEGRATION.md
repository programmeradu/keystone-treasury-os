# Solana RPC Integration - Phase 2B

## Overview

Phase 2B implements real Solana blockchain integration for automated DCA bot execution. This includes balance checking, transaction signing, and on-chain execution.

## Completed Components

### 1. Solana RPC Module (`src/lib/solana-rpc.ts`)

**Functions Implemented:**
- `getConnection()` - Creates Solana RPC connection
- `getSolBalance(walletAddress)` - Get native SOL balance
- `getTokenBalance(walletAddress, tokenMint)` - Get SPL token balance
- `getTokenBalanceUSD(...)` - Get token balance in USD
- `hasSufficientBalance(...)` - Check if wallet has enough tokens
- `sendVersionedTransaction(...)` - Send Jupiter swap transactions
- `confirmTransaction(...)` - Wait for transaction confirmation
- `getTransaction(...)` - Fetch transaction details
- `estimateTransactionFee(...)` - Estimate gas fees
- `tokenAccountExists(...)` - Check if token account is initialized
- `checkRPCHealth()` - Monitor RPC endpoint health

**Configuration:**
```typescript
// Environment variable required:
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

**Common Token Addresses:**
```typescript
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};
```

### 2. Jupiter Executor Updates (`src/lib/jupiter-executor.ts`)

**Updated Functions:**

**`checkBalance(wallet, mint, rpcUrl)`**
- ✅ Now uses real Solana RPC connection
- ✅ Handles both SOL and SPL tokens
- ✅ Returns actual on-chain balance

**`executeSwap(params)`**
- ✅ Gets Jupiter quote
- ✅ Builds swap transaction
- ✅ Returns unsigned transaction
- ⚠️ Does NOT sign or send yet (requires delegation)

**`executeSwapWithSigning(params)` (NEW)**
- ✅ Complete flow: quote → build → sign → send
- ⚠️ Requires `signerKeypair` parameter
- ⚠️ Currently returns error if no signer provided
- 🔄 TODO: Implement delegation mechanism

## Pending Implementation: Delegation System

### The Challenge

DCA bots need to execute swaps automatically without user interaction, but we cannot store private keys (non-custodial requirement). Solution: **Solana Token Delegation**.

### How Token Delegation Works

Solana allows users to delegate spending authority for specific SPL tokens to another account. The delegated account can then spend up to the approved amount on behalf of the user.

### Implementation Steps

#### Step 1: Research Solana Delegation API

**Read Documentation:**
- https://solana.com/docs/core/tokens#token-delegate
- https://spl.solana.com/token#delegating-account-authority

**Key Functions Needed:**
```typescript
import { approve, revoke } from '@solana/spl-token';

// User approves delegation
await approve(
  connection,
  payer,           // User's wallet (pays fees)
  tokenAccount,    // User's token account
  delegate,        // Our server's delegation wallet
  owner,           // User's wallet (signs approval)
  amount           // Max amount delegate can spend
);

// Server uses delegation to execute swap
// Transaction will be signed by delegation wallet

// User revokes delegation
await revoke(
  connection,
  payer,
  tokenAccount,
  owner
);
```

#### Step 2: Create Delegation Wallet

**Generate Server-Side Keypair:**
```bash
# Generate new keypair for delegation authority
solana-keygen new --outfile delegation-wallet.json

# Fund with small amount of SOL for tx fees
solana transfer DELEGATION_PUBLIC_KEY 0.1 --url mainnet-beta
```

**Store Securely:**
```
Environment Variables:
DELEGATION_WALLET_PRIVATE_KEY=base58_encoded_key
DELEGATION_WALLET_PUBLIC_KEY=base58_public_key
```

**Security Notes:**
- This wallet only holds delegation authority, NOT user funds
- Cannot transfer user tokens to itself
- Can only execute swaps within approved limits
- User can revoke at any time

#### Step 3: Database Schema for Delegations

**Already Added in Phase 2:**
```sql
-- In dca_bots table
delegation_amount REAL,        -- Amount user approved (in smallest units)
delegation_expiry INTEGER,     -- Unix timestamp when delegation expires
```

**Additional Table (Optional):**
```sql
CREATE TABLE token_delegations (
  id INTEGER PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  token_mint TEXT NOT NULL,
  delegated_amount REAL NOT NULL,
  remaining_amount REAL NOT NULL,
  expiry_timestamp INTEGER NOT NULL,
  delegation_signature TEXT,
  revoked BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_wallet, token_mint)
);
```

#### Step 4: API Routes for Delegation

**`POST /api/delegation/request`**
```typescript
// User initiates delegation
{
  walletAddress: string;
  tokenMint: string;
  amount: number;      // How much to approve
  expiryDays: number;  // 30, 60, 90 days
}

// Returns:
{
  delegationWallet: string;     // Address to approve
  transaction: string;          // Unsigned approval transaction
  expiryTimestamp: number;
}
```

**`POST /api/delegation/confirm`**
```typescript
// After user signs approval transaction
{
  walletAddress: string;
  tokenMint: string;
  signedTransaction: string;    // Signed approval tx
}

// Sends transaction, stores in database
```

**`POST /api/delegation/revoke`**
```typescript
// User revokes delegation
{
  walletAddress: string;
  tokenMint: string;
}

// Returns unsigned revoke transaction
```

**`GET /api/delegation/status`**
```typescript
// Check current delegations
{
  walletAddress: string;
}

// Returns:
{
  delegations: [
    {
      tokenMint: string;
      tokenSymbol: string;
      approvedAmount: number;
      remainingAmount: number;
      expiresAt: number;
    }
  ]
}
```

#### Step 5: UI Components for Delegation

**Component: `DelegationSetupModal.tsx`**
```typescript
// Modal flow:
1. User clicks "Enable Auto-Execution" on bot
2. Explain what delegation is (educational)
3. Input: Spending limit ($100 - $10,000)
4. Input: Duration (30/60/90 days)
5. Show warnings about risks
6. Button: "Approve Delegation"
7. Wallet prompts for signature
8. Success: Show active delegation details
```

**Component: `DelegationStatusCard.tsx`**
```typescript
// Display active delegations
- Token name and logo
- Approved amount
- Remaining amount (updates after each execution)
- Expiry date (countdown)
- Progress bar (spent vs remaining)
- "Revoke" button
- "Extend" button (re-approve for more time)
```

#### Step 6: Update Netlify Scheduled Function

**File: `netlify/functions/dca-execute-scheduled.mts`**

**Add Delegation Check:**
```typescript
// Before executing bot
const hasDelegation = bot.delegationAmount && 
                     bot.delegationExpiry && 
                     bot.delegationExpiry > Math.floor(Date.now() / 1000);

if (!hasDelegation) {
  console.log(`Bot ${bot.id} missing delegation, skipping`);
  await db.update(dcaBots)
    .set({ 
      status: 'paused',
      pauseReason: 'delegation_expired'
    })
    .where(eq(dcaBots.id, bot.id));
  continue;
}
```

**Use Delegation Wallet:**
```typescript
import { Keypair } from '@solana/web3.js';

// Load delegation wallet from environment
const delegationPrivateKey = process.env.DELEGATION_WALLET_PRIVATE_KEY!;
const delegationKeypair = Keypair.fromSecretKey(
  Buffer.from(delegationPrivateKey, 'base64')
);

// Execute swap with delegation authority
const result = await executeSwapWithSigning({
  inputMint: bot.paymentTokenMint,
  outputMint: bot.buyTokenMint,
  amountInSmallestUnit: paymentAmount,
  slippageBps: slippageBps,
  userWallet: bot.walletAddress,
  signerKeypair: delegationKeypair  // ✅ Now provided!
});
```

**Update Remaining Delegation:**
```typescript
if (result.success) {
  // Deduct from delegation amount
  const remaining = bot.delegationAmount! - paymentAmount;
  
  await db.update(dcaBots)
    .set({ 
      delegationAmount: remaining,
      lastExecutionAttempt: now
    })
    .where(eq(dcaBots.id, bot.id));
  
  // Auto-pause if delegation depleted
  if (remaining < paymentAmount) {
    await db.update(dcaBots)
      .set({ 
        status: 'paused',
        pauseReason: 'delegation_depleted'
      })
      .where(eq(dcaBots.id, bot.id));
  }
}
```

## RPC Provider Setup

### Recommended: Helius

**Why Helius:**
- Built for DeFi applications
- Reliable uptime (99.9%+)
- Fast response times
- Enhanced APIs for token balances
- Free tier: 100,000 requests/day
- Dedicated Solana infrastructure

**Setup Steps:**
1. Sign up: https://helius.dev
2. Create new project
3. Get API key
4. Configure in Netlify:
   ```
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   ```

**Alternative Providers:**
- **QuickNode**: Premium, expensive ($49+/month)
- **Alchemy**: Good reliability, moderate pricing
- **Public RPC**: Free but rate-limited (NOT recommended for production)

## Testing Strategy

### Phase 1: Devnet Testing

**Setup Devnet:**
```bash
# Change RPC URL
SOLANA_RPC_URL=https://api.devnet.solana.com

# Create test wallet
solana-keygen new --outfile test-wallet.json

# Get devnet SOL
solana airdrop 2 TEST_WALLET_ADDRESS --url devnet

# Get devnet USDC from faucet
# https://spl-token-faucet.com/?token-name=USDC-Dev
```

**Test Delegation Flow:**
1. Create test bot with devnet tokens
2. Approve delegation on devnet
3. Manually trigger scheduled function
4. Verify transaction on Solscan devnet
5. Check database updates
6. Test delegation depletion
7. Test delegation expiry

### Phase 2: Mainnet Testing

**Start Small:**
1. Use small amounts ($10-$20)
2. Create 1-2 test bots
3. Set short intervals (every 5 minutes)
4. Monitor for 24 hours

**Monitor:**
- Netlify function logs
- Solscan transactions
- Database execution records
- Email notifications (when implemented)
- Balance changes

**Verify:**
- Bots execute on schedule
- Transactions succeed
- Slippage within limits
- Delegation amounts update correctly
- Auto-pause works on failures

## Security Considerations

### Delegation Wallet Security

**DO:**
- ✅ Store private key in environment variables (encrypted)
- ✅ Rotate delegation wallet periodically
- ✅ Fund with minimal SOL (only for tx fees)
- ✅ Monitor for unusual activity
- ✅ Implement rate limiting on API routes

**DON'T:**
- ❌ Store private keys in code
- ❌ Commit keys to git
- ❌ Share keys with third parties
- ❌ Use same wallet for multiple purposes
- ❌ Fund with more SOL than needed

### User Wallet Security

**Protections:**
- Users never share private keys
- Delegation is limited to approved amount
- Delegation expires automatically
- Users can revoke at any time
- Cannot transfer tokens, only swap
- Server wallet cannot withdraw to itself

### API Security

**Implement:**
- Rate limiting (10 requests/minute per wallet)
- Wallet signature verification
- Input validation and sanitization
- CORS restrictions
- Request logging for audit trail

## Next Steps

1. **Sign up for Helius** (10 min)
   - Get API key
   - Add to Netlify environment variables

2. **Generate Delegation Wallet** (15 min)
   - Create keypair
   - Fund with 0.1 SOL
   - Store securely in environment

3. **Test Balance Checking** (30 min)
   - Create test endpoint
   - Test with real wallet addresses
   - Verify SOL and SPL token balances

4. **Implement Delegation API** (3-4 hours)
   - Create API routes
   - Build approval transactions
   - Test on devnet

5. **Build Delegation UI** (2-3 hours)
   - Setup modal
   - Status cards
   - Revoke functionality

6. **Update Scheduled Function** (1 hour)
   - Add delegation checks
   - Use delegation wallet for signing
   - Update remaining amounts

7. **Devnet Testing** (2-3 hours)
   - Full end-to-end flow
   - Multiple test scenarios
   - Edge case testing

8. **Mainnet Deployment** (4-6 hours)
   - Switch to mainnet RPC
   - Small test amounts
   - 24-hour monitoring

## Estimated Timeline

- **Helius Setup**: 10 minutes
- **Delegation Wallet**: 15 minutes
- **Balance Testing**: 30 minutes
- **Delegation API**: 3-4 hours
- **Delegation UI**: 2-3 hours
- **Scheduled Function Update**: 1 hour
- **Devnet Testing**: 2-3 hours
- **Mainnet Testing**: 4-6 hours

**Total**: 13-18 hours of development work

**Completion**: Phase 2B fully functional DCA bots with automated execution

## Status

✅ **Completed:**
- Solana RPC integration module
- Balance checking functions
- Transaction sending functions
- Jupiter executor updates
- Documentation

⏳ **In Progress:**
- None (ready to start delegation implementation)

🔄 **Pending:**
- Helius RPC setup
- Delegation wallet generation
- Delegation API routes
- Delegation UI components
- Scheduled function updates
- Testing (devnet → mainnet)

## Questions & Considerations

1. **Delegation Amount Defaults:**
   - What's a reasonable minimum? ($50?)
   - What's a reasonable maximum? ($10,000?)
   - Should it auto-suggest based on bot frequency?

2. **Expiry Duration:**
   - Offer 30/60/90 day options?
   - Allow custom duration?
   - Auto-reminder before expiry?

3. **Notification Preferences:**
   - When should we email users?
     - Delegation expiring soon (7 days before?)
     - Delegation depleted
     - Execution failures
     - Weekly summary?

4. **Multi-Token Delegations:**
   - If user has multiple bots with different tokens?
   - One delegation per token?
   - Shared pool or separate?

5. **Delegation Renewal:**
   - Auto-prompt user when expiring?
   - Allow extending vs re-approving?
   - Grace period after expiry?

Let me know your preferences and we can proceed with implementation!
