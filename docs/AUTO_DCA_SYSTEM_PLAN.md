# Auto-DCA Bot System - Complete Implementation Plan

> **Goal**: Build a REAL, fully functional Dollar-Cost Averaging bot system that allows users to create, manage, and execute automated token purchases on Solana.

---

## 🎯 System Overview

### What We're Building:
A **production-ready DCA bot platform** that:
1. ✅ Lets users create custom DCA strategies
2. ✅ Automatically executes trades on schedule
3. ✅ Tracks performance and notifies users
4. ✅ Manages wallet security properly
5. ✅ Handles errors gracefully
6. ✅ Provides real-time status updates

### Core Value Proposition:
**"Set it and forget it"** - Users define their strategy once, and the system executes trades automatically without manual intervention.

---

## 🏗️ Architecture Design

### Layer 1: Frontend (User Interface)
**File**: `src/components/atlas/DCABotCard.tsx`

**Components Needed:**
1. **Bot List View** ✅ (Already exists - shows active bots)
2. **Bot Creation Modal** 🔧 (Need to build)
3. **Bot Detail/Edit View** 🔧 (Need to build)
4. **Performance Charts** 🔧 (Need to build)

**User Flow:**
```
1. User clicks "+ Create New Bot"
   ↓
2. Modal opens with bot configuration form:
   - Bot Name (e.g., "SOL Weekly Savings")
   - Buy Token (e.g., SOL, BONK, JUP)
   - Payment Token (USDC, SOL)
   - Amount per purchase ($50, $100, etc.)
   - Frequency (Daily, Weekly, Bi-weekly, Monthly)
   - Start Date
   - End Date (optional)
   - Max Slippage (0.5% - 5%)
   ↓
3. User connects wallet (if not connected)
   ↓
4. System validates:
   - Sufficient balance for first purchase
   - Token exists and has liquidity
   - Wallet has approval to spend
   ↓
5. Bot created and stored in database
   ↓
6. First execution scheduled
   ↓
7. User sees bot in "Active" list
```

---

### Layer 2: API Routes (Business Logic)
**File**: `src/app/api/solana/dca-bot/route.ts`

**Endpoints Needed:**

#### 1. **GET /api/solana/dca-bot?action=list**
- Returns all bots for authenticated user
- Calculates current P/L based on live prices
- Status: ✅ **Implemented (mock mode)**

#### 2. **POST /api/solana/dca-bot (action: create)**
```typescript
Request Body:
{
  action: "create",
  name: "SOL Weekly DCA",
  buyToken: "So11111111111111111111111111111111111111112", // SOL mint
  paymentToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
  amountUsd: 100,
  frequency: "weekly", // daily, weekly, biweekly, monthly
  startDate: "2025-10-15T00:00:00Z",
  endDate: null, // optional
  maxSlippage: 0.5,
  walletAddress: "USER_PUBLIC_KEY"
}

Response:
{
  success: true,
  botId: "dca_abc123",
  nextExecution: "2025-10-22T00:00:00Z",
  estimatedGas: 0.001 // SOL
}
```

#### 3. **POST /api/solana/dca-bot (action: execute)**
- Called by cron job/scheduler
- Fetches Jupiter quote for best price
- Executes swap transaction
- Updates bot statistics
- Sends notification to user

#### 4. **POST /api/solana/dca-bot (action: pause/resume/delete)**
- Manage bot lifecycle
- Status: ✅ **Partially implemented**

---

### Layer 3: Database Schema
**File**: `src/db/schema.ts`

**Tables Needed:**

#### 1. **dca_bots**
```typescript
{
  id: string (primary key),
  userId: string (foreign key to users),
  name: string,
  buyTokenMint: string,
  paymentTokenMint: string,
  amountUsd: number,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  startDate: timestamp,
  endDate: timestamp | null,
  maxSlippage: number,
  status: 'active' | 'paused' | 'completed' | 'failed',
  walletAddress: string,
  nextExecution: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### 2. **dca_executions**
```typescript
{
  id: string (primary key),
  botId: string (foreign key to dca_bots),
  executedAt: timestamp,
  paymentAmount: number,
  receivedAmount: number,
  price: number,
  slippage: number,
  txSignature: string,
  gasUsed: number,
  status: 'success' | 'failed',
  errorMessage: string | null
}
```

#### 3. **user_wallets** (if not exists)
```typescript
{
  userId: string,
  publicKey: string,
  encryptedPrivateKey: string | null, // For custodial wallets only
  walletType: 'phantom' | 'solflare' | 'custodial',
  createdAt: timestamp
}
```

---

### Layer 4: Execution Engine (Cron/Scheduler)
**File**: `src/lib/dca-scheduler.ts` (NEW)

**Options:**

#### **Option A: Vercel Cron Jobs** (Recommended for MVP)
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/dca-execute",
    "schedule": "0 * * * *" // Every hour
  }]
}
```

**Pros:**
- Built into Vercel hosting
- No additional infrastructure
- Free on Pro plan

**Cons:**
- Limited to hourly execution
- Can't run more frequently than every minute

#### **Option B: Upstash QStash** (Recommended for Production)
```typescript
// Schedule individual bot executions
import { Client } from "@upstash/qstash";

const client = new Client({ token: process.env.QSTASH_TOKEN });

// When creating bot:
await client.publishJSON({
  url: "https://keystone.stauniverse.tech/api/solana/dca-bot",
  body: { action: "execute", botId: bot.id },
  delay: calculateNextExecution(bot.frequency)
});
```

**Pros:**
- Precise scheduling (down to the second)
- Built-in retries
- Scales automatically
- Free tier: 10k requests/month

**Cons:**
- Requires additional service signup

#### **Option C: Database-Driven Polling**
- API route checks database every minute for due executions
- Simple but inefficient at scale

---

### Layer 5: Transaction Execution (Jupiter Integration)
**File**: `src/lib/jupiter-executor.ts` (NEW)

**Flow:**
```typescript
1. Get Jupiter quote
   ↓
2. Validate slippage is acceptable
   ↓
3. Build transaction
   ↓
4. Sign with user's wallet (need delegation)
   ↓
5. Send transaction
   ↓
6. Wait for confirmation
   ↓
7. Parse result and update database
```

**Key Challenge: Wallet Signing**

#### **Option A: User Delegation (Non-Custodial)** ⭐ RECOMMENDED
```typescript
// User grants limited delegation authority to DCA program
// Uses Solana's Token Delegate instruction
// Bot can only spend approved amount for specific token
```

**Pros:**
- User keeps full control
- Non-custodial (we never hold keys)
- More secure

**Cons:**
- Requires wallet approval each time (or delegation setup)
- More complex UX

#### **Option B: Custodial Wallet (Easy but Risky)**
```typescript
// User deposits funds to platform-managed wallet
// Platform executes trades on their behalf
```

**Pros:**
- Simple UX
- No delegation needed

**Cons:**
- We hold user funds (regulatory risk)
- Security liability
- Users lose self-custody

#### **Option C: Session Keys (Best of Both Worlds)** ⭐⭐ BEST
```typescript
// User creates temporary "session key" with limited permissions
// Valid for X days/weeks
// Can only execute DCA trades up to approved amount
// User can revoke anytime
```

**Pros:**
- Non-custodial
- Smooth UX (no repeated approvals)
- Limited risk (time + amount bounded)

**Cons:**
- Requires Solana program development
- More complex initial setup

---

## 🔐 Security Architecture

### Wallet Security Models:

#### **Phase 1 (MVP): Manual Execution**
- User must approve each trade manually
- Bot just schedules reminders/notifications
- Zero custody, zero risk
- **Status**: Easiest to implement, good for testing

#### **Phase 2: Delegated Execution**
- User approves "spend limit" for specific token
- Bot auto-executes within approved limits
- User can revoke delegation anytime
- **Status**: Production-ready, recommended approach

#### **Phase 3: Session Keys**
- Advanced users can create time-bound session keys
- Fully automated with time/amount limits
- **Status**: Future enhancement

---

## 📊 Performance Tracking

### Metrics to Calculate:

1. **Average Buy Price**: `totalSpent / totalReceived`
2. **Current Value**: `totalReceived * currentPrice`
3. **Profit/Loss**: `(currentValue - totalSpent) / totalSpent * 100`
4. **DCA vs Lump Sum**: Compare strategy performance
5. **Cost Basis**: For tax reporting
6. **Execution Success Rate**: `successful / total * 100`

### Analytics Dashboard:
- Historical price chart with purchase markers
- P/L over time graph
- Comparison: DCA strategy vs lump sum investment
- Gas costs analysis
- Best/worst execution prices

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Week 1)** 🎯 START HERE
**Files to Create/Modify:**
1. `src/db/schema.ts` - Add DCA tables
2. `src/lib/jupiter-executor.ts` - Jupiter swap logic
3. `src/components/atlas/DCABotModal.tsx` - Creation UI

**Tasks:**
- [ ] Create database schema with Drizzle ORM
- [ ] Build bot creation modal UI
- [ ] Implement Jupiter quote fetching
- [ ] Add basic validation (balance, liquidity)
- [ ] Manual execution only (user clicks "Execute Now")

**Test Criteria:**
- User can create a bot with valid parameters
- Bot appears in list with correct data
- Manual execution button works
- Transaction appears on Solscan

---

### **Phase 2: Automation (Week 2)**
**Files to Create/Modify:**
1. `src/app/api/cron/dca-execute/route.ts` - Cron endpoint
2. `vercel.json` - Add cron schedule
3. `src/lib/notifications.ts` - Email/push notifications

**Tasks:**
- [ ] Set up Vercel Cron or QStash
- [ ] Implement automatic execution logic
- [ ] Add retry mechanism for failed trades
- [ ] Send email notifications on execution
- [ ] Handle edge cases (insufficient balance, network errors)

**Test Criteria:**
- Bot executes automatically at scheduled time
- Failed executions retry appropriately
- User receives notification after each trade
- Database records execution history

---

### **Phase 3: Delegation & Security (Week 3)**
**Files to Create/Modify:**
1. `src/lib/solana-delegation.ts` - Token delegation logic
2. `src/components/atlas/WalletApproval.tsx` - Approval UI

**Tasks:**
- [ ] Research Solana token delegation
- [ ] Implement approval request flow
- [ ] Add delegation revocation
- [ ] Security audit of execution flow
- [ ] Add spending limits enforcement

**Test Criteria:**
- User can approve delegation
- Bot respects spending limits
- User can revoke delegation
- System handles expired delegations

---

### **Phase 4: Analytics & Polish (Week 4)**
**Files to Create/Modify:**
1. `src/components/atlas/DCAPerformance.tsx` - Charts
2. `src/lib/dca-analytics.ts` - Calculations

**Tasks:**
- [ ] Build performance charts (Recharts)
- [ ] Add DCA vs Lump Sum comparison
- [ ] Export trade history (CSV)
- [ ] Tax reporting helpers
- [ ] Mobile optimization

---

## 🛠️ Technical Stack

### Frontend:
- **React**: Component framework
- **Recharts**: Performance graphs
- **Shadcn UI**: Form components
- **Solana Wallet Adapter**: Wallet connection

### Backend:
- **Next.js API Routes**: Endpoints
- **Drizzle ORM**: Database management
- **Turso (LibSQL)**: Database
- **Jupiter API**: DEX aggregation

### Execution:
- **Vercel Cron** or **Upstash QStash**: Scheduling
- **@solana/web3.js**: Transaction building
- **Resend**: Email notifications

---

## 💰 Cost Estimation

### Per Bot Per Month:
- **Gas Fees**: ~0.001 SOL per execution
  - Daily: 30 executions = 0.03 SOL (~$6)
  - Weekly: 4 executions = 0.004 SOL (~$0.80)
  - Monthly: 1 execution = 0.001 SOL (~$0.20)

### Platform Costs:
- **Database**: Turso free tier (500MB, 1B rows)
- **Cron/Scheduler**: Vercel free or QStash free tier (10k/month)
- **Email**: Resend free tier (3k emails/month)

### Scaling:
- 1,000 active bots @ weekly frequency = 4,000 executions/month
- Cost: ~0.8 SOL gas + minimal platform costs
- **Monetization**: Charge 0.1% execution fee or $2/month per bot

---

## 🎯 Success Metrics

### Phase 1 (MVP):
- ✅ 10 beta users create DCA bots
- ✅ 50+ successful manual executions
- ✅ Zero security incidents

### Phase 2 (Automation):
- ✅ 100+ active automated bots
- ✅ 95%+ execution success rate
- ✅ Users save 5+ hours/month vs manual DCA

### Phase 3 (Production):
- ✅ 1,000+ active users
- ✅ $500k+ monthly DCA volume
- ✅ Featured on Solana ecosystem page
- ✅ Integration with Phantom/Solflare

---

## 🚨 Risk Mitigation

### Technical Risks:
1. **Jupiter API downtime** → Fallback to Orca/Raydium direct
2. **Transaction failures** → Retry logic with exponential backoff
3. **Network congestion** → Dynamic gas price adjustment
4. **Database errors** → Transaction rollback, error logging

### Security Risks:
1. **Wallet compromise** → Use delegation, never store private keys
2. **SQL injection** → Parameterized queries with Drizzle ORM
3. **CSRF attacks** → CSRF tokens on all POST requests
4. **API abuse** → Rate limiting, authentication

### Regulatory Risks:
1. **Custody regulations** → Non-custodial only (delegation model)
2. **Securities laws** → Disclaimer: "Not financial advice"
3. **Tax implications** → Provide export tools, recommend CPA

---

## 📝 Next Steps

### Immediate Actions (Today):
1. ✅ Review this plan with team
2. ✅ Choose execution model (manual → automated → delegated)
3. ✅ Set up database schema
4. ✅ Build bot creation modal UI

### This Week:
1. Implement manual execution (Phase 1)
2. Test with real tokens on devnet
3. Deploy to production with 5 beta testers

### This Month:
1. Add automation (Phase 2)
2. Implement delegation (Phase 3)
3. Launch public beta

---

**Ready to start building?** Let me know which phase you want to tackle first, and I'll begin implementing!
