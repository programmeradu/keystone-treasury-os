# Phase 2: Automated DCA Bot Execution

## Overview

Phase 2 adds **automated execution** to the DCA bot system. Bots will run on schedule without user intervention, using Vercel Cron for scheduling and a delegation system for secure wallet access.

---

## Architecture Decision

### Scheduling: Vercel Cron ✅
- **Why**: Built into Vercel (no extra service), reliable, free tier sufficient
- **Alternative Considered**: Upstash QStash (more features but extra complexity)
- **Schedule**: Check for due executions every 5 minutes

### Wallet Security: Token Delegation ✅
- **Approach**: User approves spending limit via Solana Token Program
- **Non-Custodial**: We never hold private keys
- **Revocable**: User can cancel delegation anytime
- **Scoped**: Limited to specific token and amount

---

## Implementation Tasks

### 1. Cron Execution Engine
**File**: `src/app/api/cron/dca-execute/route.ts`

**Responsibilities:**
- Runs every 5 minutes via Vercel Cron
- Queries database for bots due to execute
- Validates wallet has sufficient balance
- Executes swap via Jupiter
- Records execution in database
- Updates bot's next execution time
- Handles errors and retries

**Flow:**
```
1. GET bots WHERE next_execution <= NOW() AND status = 'active'
2. For each bot:
   a. Check if delegation is still valid
   b. Verify sufficient balance
   c. Get Jupiter quote
   d. Validate slippage < max_slippage
   e. Execute swap
   f. Record execution in dca_executions
   g. Update bot: execution_count++, next_execution++, total_invested++
   h. Send notification email
3. Handle failures with exponential backoff
```

---

### 2. Enhanced Jupiter Executor
**File**: `src/lib/jupiter-executor.ts` (EXTEND EXISTING)

**New Functions:**
```typescript
async function executeSwap(params: {
  wallet: PublicKey,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
  delegatedAuthority?: PublicKey
}): Promise<{
  signature: string,
  inputAmount: number,
  outputAmount: number,
  price: number,
  slippage: number
}>

async function checkBalance(
  wallet: PublicKey,
  mint: string
): Promise<number>

async function validateDelegation(
  wallet: PublicKey,
  delegate: PublicKey,
  mint: string
): Promise<{
  isValid: boolean,
  amount: number
}>
```

---

### 3. Vercel Cron Configuration
**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/dca-execute",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule**: Every 5 minutes  
**Protected**: Add auth token to prevent unauthorized calls

---

### 4. Notification System
**File**: `src/lib/notifications.ts`

**Email Templates:**
- Execution success (with tx signature, amounts, price)
- Execution failed (with reason and next retry)
- Bot paused (insufficient balance)
- Delegation expired

**Provider Options:**
- Resend (recommended, free tier)
- SendGrid
- AWS SES

---

### 5. Token Delegation UI
**File**: `src/components/atlas/DelegationSetup.tsx`

**User Flow:**
```
1. User creates bot
2. System calculates required delegation amount
3. User clicks "Approve Automatic Execution"
4. Wallet popup asks to approve delegation
5. User approves token delegate instruction
6. Bot status changes to "Active (Automated)"
```

**Delegation Amount:**
```typescript
// For a bot buying $100 SOL weekly for 6 months:
const requiredAmount = amountUsd * executionsCount * 1.1; // 10% buffer
// Example: $100 * 26 * 1.1 = $2,860 USDC delegation
```

---

### 6. Execution History UI
**File**: `src/components/atlas/ExecutionHistory.tsx`

**Display:**
- List of all executions for a bot
- Columns: Date, Amount In, Amount Out, Price, Slippage, Status, Tx Link
- Filters: Date range, Status (success/failed)
- Export to CSV for tax reporting

---

### 7. Error Handling & Retries
**File**: `src/lib/execution-retry.ts`

**Retry Strategy:**
```
1st failure: Retry in 5 minutes
2nd failure: Retry in 15 minutes
3rd failure: Retry in 1 hour
4th failure: Pause bot, email user
```

**Common Errors:**
- Insufficient balance → Pause bot
- Slippage too high → Skip execution, try next time
- Network error → Retry with backoff
- Delegation expired → Pause bot, notify user

---

### 8. Database Schema Updates
**File**: `src/db/schema.ts`

**Add to `dca_bots` table:**
```typescript
delegationAmount: real,          // Approved amount
delegationExpiry: integer,        // Timestamp when delegation expires
lastExecutionAttempt: integer,   // Last time we tried to execute
failedAttempts: integer,         // Consecutive failures
pauseReason: text,               // Why bot was auto-paused
```

**Update `dca_executions` table:**
```typescript
errorCode: text,                 // Error type if failed
retryCount: integer,             // How many retries
jupiterRoute: text,              // JSON of swap route used
```

---

### 9. Admin Dashboard
**File**: `src/app/admin/dca-monitor/page.tsx` (Optional)

**Monitoring:**
- Total active bots
- Executions today (success/failed)
- Average execution time
- Gas costs total
- Bots paused (with reasons)
- Upcoming executions (next hour)

---

## Security Considerations

### 1. Cron Endpoint Protection
```typescript
// Verify request is from Vercel Cron
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Delegation Verification
```typescript
// ALWAYS verify delegation before executing
const delegation = await validateDelegation(
  userWallet,
  platformDelegate,
  paymentToken
);

if (!delegation.isValid || delegation.amount < requiredAmount) {
  await pauseBot(botId, 'Delegation expired or insufficient');
  return;
}
```

### 3. Slippage Protection
```typescript
// Never execute if slippage exceeds user's limit
if (actualSlippage > bot.maxSlippage) {
  await skipExecution(botId, 'Slippage too high');
  return;
}
```

### 4. Rate Limiting
```typescript
// Limit executions per wallet per hour
const execsLastHour = await countRecentExecutions(wallet, '1h');
if (execsLastHour > 10) {
  await pauseBot(botId, 'Rate limit exceeded');
  return;
}
```

---

## Testing Strategy

### Unit Tests
- Jupiter quote fetching
- Balance checking
- Delegation validation
- Retry logic
- Next execution calculation

### Integration Tests
- Full execution flow (with testnet)
- Error handling paths
- Cron scheduling
- Email notifications

### Manual Testing
1. Create bot with daily frequency
2. Set next_execution to 1 minute ago
3. Trigger cron manually: `curl /api/cron/dca-execute`
4. Verify execution recorded
5. Check email received
6. Verify bot updated correctly

---

## Deployment Checklist

### Environment Variables (Add to Netlify/Vercel)
```bash
CRON_SECRET=xxx                    # Random secret for cron auth
JUPITER_PLATFORM_FEE_BPS=20        # 0.2% platform fee
RESEND_API_KEY=xxx                 # For email notifications
SOLANA_RPC_URL=xxx                 # Helius or QuickNode
DELEGATE_WALLET_PRIVATE_KEY=xxx    # Platform delegate wallet (encrypted)
```

### Database Migration
```bash
node scripts/update-dca-schema.mjs  # Add new columns
```

### Vercel Configuration
```bash
# Upload vercel.json with cron config
vercel --prod
```

---

## Success Metrics (Phase 2)

- [ ] Cron runs every 5 minutes without errors
- [ ] Bots execute automatically at scheduled time
- [ ] Execution success rate > 95%
- [ ] Average execution time < 30 seconds
- [ ] Email notifications sent within 1 minute
- [ ] Failed executions retry correctly
- [ ] Users can approve/revoke delegations
- [ ] Zero security incidents

---

## Rollout Plan

### Week 1: Core Automation
- Day 1-2: Cron endpoint + execution engine
- Day 3-4: Enhanced Jupiter integration
- Day 5: Error handling + retries

### Week 2: User Experience
- Day 1-2: Delegation UI
- Day 3-4: Execution history
- Day 5: Email notifications

### Week 3: Polish & Testing
- Day 1-2: Testnet testing
- Day 3: Security audit
- Day 4-5: Beta testing with 5-10 users

### Week 4: Production
- Gradual rollout (10 users → 50 → 100+)
- Monitor error rates
- Gather feedback
- Optimize performance

---

## Phase 3 Preview

After Phase 2 is stable, Phase 3 will add:
- Session keys for advanced users
- Multi-token portfolio DCA
- Smart execution (buy dips, avoid high slippage)
- Mobile app with push notifications
- Tax reporting integration
- Social features (share strategies)

---

## Let's Build! 🚀

Starting with:
1. Enhanced Jupiter executor with swap execution
2. Cron endpoint for automated execution
3. Delegation validation logic
4. Basic email notifications

Ready to proceed?
