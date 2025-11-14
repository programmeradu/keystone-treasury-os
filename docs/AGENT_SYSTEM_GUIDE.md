# Agent System Documentation

## Overview

The agent system is a sophisticated autonomous execution framework that orchestrates multiple specialized agents to handle complex blockchain operations. It supports 7 distinct strategies across token swaps, portfolio management, analysis, and DCA operations.

## Architecture

### Core Components

1. **Agents**: Specialized autonomous workers
   - `TransactionAgent`: Handles signing and confirmation
   - `LookupAgent`: Fetches blockchain data
   - `AnalysisAgent`: Performs risk analysis and MEV detection
   - `BuilderAgent`: Constructs transactions and schedules
   - `ExecutionCoordinator`: Orchestrates all agents

2. **Execution Context**: Stateful container holding all execution data across agent calls
3. **Error Handling**: Comprehensive retry logic with exponential backoff
4. **Approval Workflow**: Support for user signature approval before execution

## Strategies

### 1. Swap Token (`swap_token`)
Execute token swaps via Jupiter
- **Input**: `inputMint`, `outputMint`, `amount`, `slippage`
- **Flow**: Lookup → Pricing → Route calculation → Simulation → Execution
- **Output**: Transaction signature, output amount, fees

### 2. Rebalance Portfolio (`rebalance_portfolio`)
Rebalance token allocations to target weights
- **Input**: `currentAllocations`, `targetAllocations`, `rebalanceType`
- **Flow**: Fetch holdings → Calculate operations → Risk analysis → Execution
- **Output**: Transaction signatures, portfolio state

### 3. Stake SOL (`stake_sol`)
Stake SOL with validators
- **Input**: `amount`, `validatorVoteAccount`, `autoCompound`
- **Flow**: Fetch validator info → Calculate → Simulation → Staking
- **Output**: Transaction signature, staked amount

### 4. Analyze Token Safety (`analyze_token_safety`)
Comprehensive token safety analysis
- **Input**: `tokenMint`, `includeDistribution`
- **Flow**: Fetch metadata → Distribution → Liquidity → Risk scoring
- **Output**: Safety score (0-100), risk level, red flags

### 5. Detect MEV (`detect_mev`)
Detect and analyze MEV opportunities
- **Input**: `walletAddress`, `lookbackMinutes`
- **Flow**: Fetch recent transactions → Analyze → Score opportunities
- **Output**: List of MEV opportunities, estimated loss

### 6. Execute DCA (`execute_dca`)
Dollar-cost averaging execution
- **Input**: `inputMint`, `outputMint`, `totalAmount`, `frequency`, `duration`
- **Flow**: Build schedule → Calculate per-order amounts → Create orders
- **Output**: DCA schedule, order details

### 7. Optimize Fees (`optimize_fees`)
Tax-loss harvesting and fee optimization
- **Input**: `walletAddress`, `timeframe`
- **Flow**: Analyze holdings → Identify opportunities → Recommendations
- **Output**: Potential savings, harvesting opportunities

## API Endpoints

### POST /api/agentic
Execute a strategy
```bash
curl -X POST http://localhost:3000/api/agentic \
  -H "Content-Type: application/json" \
  -d '{
    "strategy": "swap_token",
    "input": {
      "inputMint": "EPjFWdd5Au",
      "outputMint": "So11111111111111111111111111111111111111112",
      "amount": 1000000,
      "slippage": 0.5
    },
    "userPublicKey": "YOUR_WALLET_ADDRESS"
  }'
```

**Response**:
```json
{
  "executionId": "exec_...",
  "status": "RUNNING",
  "progress": 30,
  "result": null
}
```

### GET /api/agentic?executionId=...
Get execution status
```bash
curl http://localhost:3000/api/agentic?executionId=exec_123
```

**Response**:
```json
{
  "executionId": "exec_123",
  "status": "SUCCESS",
  "progress": 100,
  "result": {
    "transactionSignature": "...",
    "outputAmount": "1234567"
  }
}
```

### DELETE /api/agentic?executionId=...
Cancel execution
```bash
curl -X DELETE http://localhost:3000/api/agentic?executionId=exec_123
```

### POST /api/agentic/approve
Submit approval request
```bash
curl -X POST http://localhost:3000/api/agentic/approve \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "exec_123",
    "message": "Approve swap of 1 SOL?",
    "estimatedFee": 0.00025,
    "riskLevel": "low"
  }'
```

### GET /api/agentic/approve?approvalId=...
Get approval status

### PATCH /api/agentic/approve
Respond to approval request
```bash
curl -X PATCH http://localhost:3000/api/agentic/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approvalId": "approval_...",
    "approved": true,
    "signature": "base64_encoded_signature"
  }'
```

### GET /api/agentic/history?userPublicKey=...
Get execution history

## Client Integration

### React Hook: `useAgent`

```typescript
import { useAgent } from "@/hooks/use-agent";
import { PublicKey } from "@solana/web3.js";

export function MyComponent({ wallet }) {
  const { execute, loading, progress, status, error, result } = useAgent({
    userPublicKey: wallet.publicKey,
    onProgress: (p) => console.log(`Progress: ${p}%`),
    onStatusChange: (s) => console.log(`Status: ${s}`)
  });

  const handleSwap = async () => {
    try {
      const result = await execute("swap_token", {
        inputMint: "EPjFWdd5Au",
        outputMint: "So11111111111111111111111111111111111111112",
        amount: 1000000,
        slippage: 0.5
      });
      console.log("Swap completed:", result);
    } catch (error) {
      console.error("Swap failed:", error);
    }
  };

  return (
    <div>
      <button onClick={handleSwap} disabled={loading}>
        {loading ? `Swapping (${progress}%)` : "Execute Swap"}
      </button>
      {status && <p>Status: {status}</p>}
      {error && <p>Error: {error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

### Component: `AgentExecutor`

```typescript
import { AgentExecutor } from "@/components/AgentExecutor";

export function Dashboard({ wallet }) {
  return (
    <AgentExecutor
      walletPublicKey={wallet.publicKey}
      onSuccess={(result) => console.log("Success:", result)}
      onError={(error) => console.error("Error:", error)}
    />
  );
}
```

### Atlas Tool Integration

```typescript
import { executeAtlasTool, canExecuteViaAgent } from "@/lib/agent-integration";

// Check if tool can use agents
if (canExecuteViaAgent("jupiter-swap")) {
  const result = await executeAtlasTool(
    "jupiter-swap",
    {
      from: "EPjFWdd5Au",
      to: "So11111111111111111111111111111111111111112",
      amount: 1000000
    },
    userWallet.publicKey
  );
}
```

## Execution Status

The `ExecutionStatus` enum tracks execution lifecycle:

- **PENDING**: Queued for execution
- **RUNNING**: Currently executing
- **SIMULATION**: Transaction being simulated
- **APPROVAL_REQUIRED**: Awaiting user signature
- **APPROVED**: User has approved
- **EXECUTING**: Submitting transaction
- **CONFIRMING**: Awaiting blockchain confirmation
- **SUCCESS**: Completed successfully
- **FAILED**: Execution failed
- **CANCELLED**: User cancelled execution

## Error Handling

All agents implement retry logic with exponential backoff:

```typescript
// Retry configuration (configurable per agent)
- Max retries: 3
- Initial delay: 1000ms
- Max delay: 30000ms
- Backoff multiplier: 2x
- Jitter: ±10%
```

Error classification:
- **Retryable**: Network errors, timeouts, rate limits
- **Permanent**: Invalid input, insufficient balance, permissions

## Caching

Built-in caching for performance optimization:

- **Token Prices**: 5-minute TTL
- **Jupiter Routes**: 30-second TTL
- **Token Metadata**: Per-execution (no cache)

## Advanced Features

### Parallel Agent Execution
Multiple agents can execute concurrently for complex strategies:

```typescript
// Rebalance strategy
const [holdings, prices, risks] = await Promise.all([
  lookupAgent.fetchWalletHoldings(context, params),
  lookupAgent.fetchTokenPrices(context, params),
  analysisAgent.assessPortfolioRisk(context, params)
]);
```

### Progress Tracking
Real-time progress updates via callbacks:

```typescript
const { execute } = useAgent({
  onProgress: (percent) => updateProgressBar(percent)
});

// Progress: 0% → 100% across strategy execution
```

### Approval Workflow
User confirmation before sensitive operations:

```typescript
// Agent detects need for approval
context.state = ExecutionStatus.APPROVAL_REQUIRED;
context.approvalRequired = {
  message: "Approve swap of 1 SOL?",
  estimatedFee: 0.00025
};

// User signs and submits
await approveSignature(approvalId, signedMessage);
```

## Performance

**Execution Timeframes** (typical):

- Token Swap: 15-30s
- Portfolio Rebalance: 30-60s
- Token Safety Analysis: 10-15s
- MEV Detection: 5-10s
- DCA Schedule: 5s

**Resource Usage**:

- Memory: ~50MB per active execution
- RPC Requests: 5-20 per strategy
- Network Bandwidth: ~100KB per execution

## Environment Variables

```bash
# RPC Endpoint
NEXT_PUBLIC_SOLANA_RPC=https://api.mainnet-beta.solana.com

# Agent Configuration
AGENT_RETRY_MAX_ATTEMPTS=3
AGENT_TIMEOUT_MS=60000
AGENT_MAX_CONCURRENT=10
```

## Best Practices

1. **Always provide wallet context** for proper transaction signing
2. **Implement progress UI** to show execution status
3. **Handle approval requests** for sensitive operations
4. **Implement error recovery** with user notifications
5. **Cache results** to avoid redundant executions
6. **Monitor gas costs** before large operations
7. **Use appropriate slippage** settings (0.1% - 1%)
8. **Validate input parameters** before execution

## Troubleshooting

### Execution Timeout
- Increase `AGENT_TIMEOUT_MS` in environment
- Check RPC endpoint health
- Verify network connectivity

### Approval Required but Not Responding
- Check if user dismissed the prompt
- Verify signature validity
- Re-submit approval request

### MEV Detected
- Increase slippage tolerance
- Use private RPC if available
- Reduce transaction size

## Future Enhancements

- [ ] Multi-step atomic transactions
- [ ] Custom strategy composition
- [ ] ML-based MEV prediction
- [ ] Cross-chain execution
- [ ] Advanced scheduling
- [ ] Webhook notifications
- [ ] Execution analytics
- [ ] Role-based permissions
