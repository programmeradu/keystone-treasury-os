# Agent System - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Development Server
```bash
npm run dev
```
Server will start at `http://localhost:3000`

### 2. Navigate to Agent Dashboard
Go to `http://localhost:3000/app` and select the "Agents" tab.

### 3. Test a Strategy
Click "Execute" tab and select a strategy:
- **Swap Token** - Exchange SOL for USDC
- **Analyze Token Safety** - Get safety score for a token
- **Detect MEV** - Scan for MEV opportunities
- **Rebalance Portfolio** - Auto-rebalance holdings
- **Execute DCA** - Dollar-cost averaging
- **Optimize Fees** - Tax optimization

### 4. Monitor Execution
Watch real-time progress in the "Monitor" tab with:
- Progress bars (0-100%)
- Status indicators
- Execution queue
- Elapsed time

### 5. View History
Check "History" tab for past executions with:
- Filter by status or strategy
- Sort by date
- Expand for details
- View gas costs
- Solscan transaction links

---

## 📋 Test Commands

Run these from terminal:

```bash
# Validate all components
node test-agents-direct.mjs

# Simulate execution flow
node test-agents-flow.mjs

# Check codebase statistics
node test-agents-validate.mjs

# Test API endpoints (requires dev server)
node test-agents-api.mjs
```

---

## 🔌 API Endpoints

### Execute Strategy
```bash
POST /api/agentic
Content-Type: application/json

{
  "strategy": "swap_token",
  "input": {
    "tokenA": "SOL",
    "tokenB": "USDC",
    "amount": 1
  }
}
```

### Check Status
```bash
GET /api/agentic?executionId=exec-abc123
```

### Get History
```bash
GET /api/agentic/history?limit=10&offset=0
```

### Request Approval
```bash
POST /api/agentic/approve
Content-Type: application/json

{
  "executionId": "exec-123",
  "message": "Approve transaction"
}
```

### Submit Signature
```bash
PATCH /api/agentic/approve
Content-Type: application/json

{
  "approvalId": "approval-123",
  "approved": true,
  "signature": "..."
}
```

---

## 🎯 Strategy Details

### swap_token
**What it does:** Exchange one token for another via Jupiter DEX
**Steps:**
1. Validate token addresses
2. Fetch current prices
3. Calculate best route
4. Simulate transaction
5. Request user approval
6. Sign & broadcast transaction
7. Wait for confirmation

### analyze_token_safety
**What it does:** Get safety score and red flags for a token
**Output:** Safety score (0-100), risk level, verified status

### detect_mev
**What it does:** Scan for MEV extraction opportunities
**Output:** MEV risk level, recommended slippage, estimated loss

### rebalance_portfolio
**What it does:** Auto-rebalance portfolio to target allocation
**Steps:** Analyze current allocation → Plan trades → Get approval → Execute

### execute_dca
**What it does:** Dollar-cost averaging - regular purchases
**Schedule:** Configurable intervals (hourly, daily, weekly)

### optimize_fees
**What it does:** Tax loss harvesting and fee optimization
**Output:** Recommended swaps, potential tax savings

---

## �� Dashboard Features

### Execute Tab
- Strategy selector dropdown
- Input parameter form
- Execute button
- Real-time status display

### Monitor Tab
- Active executions list
- Progress bars with percentage
- Status icons
- Cancel buttons
- Elapsed time counters
- Queue summary

### History Tab
- All past executions
- Filter by status/strategy
- Sort by date
- Expandable rows
- Gas usage display
- Solscan links
- Error details

### Approvals Tab
- Pending approvals list
- Risk assessment
- Fee estimation
- Approve/reject buttons
- Message signing

---

## 🔐 Security Features

✅ Wallet-based authentication
✅ Transaction simulation before execution
✅ User approval workflow
✅ Signature verification
✅ Error classification and handling
✅ Retry logic with limits
✅ Rate limiting
✅ Audit trail (execution history)

---

## 📈 Monitoring

### Real-time Updates
- Progress updates every 100-500ms
- Status change notifications
- Error alerts
- Execution completion events

### Execution Statistics
- Total executions
- Success rate
- Average duration
- Gas spent
- Per-strategy metrics

### Logging
All executions logged to:
- Database (agentExecutions table)
- Execution history UI
- Browser console (dev mode)

---

## 🐛 Troubleshooting

### "Strategy failed to execute"
→ Check wallet connection
→ Verify input parameters
→ Check blockchain RPC health

### "Approval request timed out"
→ Approval expires after 5 minutes
→ Submit new approval request
→ Check wallet notifications

### "Transaction simulation failed"
→ May indicate insufficient balance
→ Check account funding
→ Verify token pair is tradeable

### "No execution history"
→ Database may not be initialized
→ Check database schema
→ Clear browser cache

---

## 📚 Additional Resources

- Full test report: AGENT_SYSTEM_TEST_REPORT.md
- Agent architecture: AGENT_SYSTEM_GUIDE.md
- Integration guide: AGENT_INTEGRATION_GUIDE.md
- Examples: AGENT_EXAMPLES.md

---

## ✅ Verification Checklist

Before going to production:

- [ ] Test wallet connection
- [ ] Execute at least one strategy
- [ ] Verify approval workflow
- [ ] Check execution history
- [ ] Test cancellation
- [ ] Verify error handling
- [ ] Check real-time updates
- [ ] Test with different tokens
- [ ] Verify gas calculations
- [ ] Check database persistence

---

## 🎉 Ready to Go!

Your agent system is fully functional and production-ready. Start by:

1. `npm run dev`
2. Navigate to `http://localhost:3000/app`
3. Connect your wallet
4. Execute your first strategy!

Happy autonomously executing! 🤖
