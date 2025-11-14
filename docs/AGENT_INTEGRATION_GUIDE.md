# Agent System Integration Guide

## Quick Start

### 1. Basic Token Swap

```typescript
import { useAgent } from "@/hooks/use-agent";

function SwapComponent({ wallet }) {
  const { execute, loading, result, error } = useAgent({
    userPublicKey: wallet.publicKey
  });

  const swap = async () => {
    const result = await execute("swap_token", {
      inputMint: "EPjFWdd5Au",          // USDC
      outputMint: "So11111111111111111111111111111111111111112", // SOL
      amount: 1000000,                   // 1 USDC in lamports
      slippage: 0.5                      // 0.5% slippage
    });
    console.log("Swapped:", result);
  };

  return <button onClick={swap}>Swap</button>;
}
```

### 2. Token Safety Analysis

```typescript
const result = await execute("analyze_token_safety", {
  tokenMint: "TokenAddress",
  includeDistribution: true
});

console.log(result.result); // SafetyScore, riskLevel, redFlags
```

### 3. MEV Detection

```typescript
const result = await execute("detect_mev", {
  walletAddress: wallet.publicKey.toBase58(),
  lookbackMinutes: 60
});

result.result.opportunities.forEach(opp => {
  console.log(`${opp.type}: ${opp.estimatedProfit} SOL`);
});
```

## Integration Patterns

### Pattern 1: Direct Atlas Tool Integration

```typescript
import { executeAtlasTool } from "@/lib/agent-integration";

// In your atlas tool handler
async function handleToolExecution(toolId, params, wallet) {
  // Check if tool supports agents
  if (canExecuteViaAgent(toolId)) {
    return executeAtlasTool(toolId, params, wallet.publicKey);
  }
  
  // Fallback to traditional execution
  return executeTraditionalTool(toolId, params, wallet);
}
```

### Pattern 2: Custom Strategy Composition

```typescript
import { ExecutionCoordinator } from "@/lib/agents";

async function complexOperation(wallet) {
  const coordinator = new ExecutionCoordinator(rpcEndpoint);
  
  // Step 1: Analyze safety
  const safety = await coordinator.executeStrategy(
    "analyze_token_safety",
    { tokenMint: "..." }
  );
  
  if (safety.result.riskLevel === "safe") {
    // Step 2: Execute swap
    return coordinator.executeStrategy(
      "swap_token",
      { inputMint: "...", outputMint: "...", amount: 1000000 }
    );
  }
}
```

### Pattern 3: Progressive UI Updates

```typescript
function ExecutionMonitor({ strategy, input }) {
  const { execute, progress, status, result, cancel } = useAgent({
    onProgress: (p) => updateUI(p),
    onStatusChange: (s) => logStatus(s)
  });

  useEffect(() => {
    execute(strategy, input);
  }, []);

  return (
    <div>
      <ProgressBar value={progress} max={100} />
      <StatusBadge status={status} />
      {result && <ResultDisplay result={result} />}
      <button onClick={cancel}>Cancel</button>
    </div>
  );
}
```

## Supported Tool Mappings

| Tool ID | Strategy | Input Parameters |
|---------|----------|-----------------|
| `swap-token` | `swap_token` | `inputMint`, `outputMint`, `amount` |
| `jupiter-swap` | `swap_token` | Same as above |
| `rebalance` | `rebalance_portfolio` | `currentAllocations`, `targetAllocations` |
| `staking` | `stake_sol` | `amount`, `validator` |
| `token-safety` | `analyze_token_safety` | `tokenMint` |
| `mev-detect` | `detect_mev` | `walletAddress` |
| `dca` | `execute_dca` | `inputMint`, `outputMint`, `amount`, `frequency` |
| `fee-optimizer` | `optimize_fees` | `walletAddress` |

## Error Handling Examples

### Retry on Network Error

```typescript
const { execute, error } = useAgent();

try {
  await execute("swap_token", params);
} catch (err) {
  if (err.code === "NETWORK_ERROR") {
    // Agents automatically retry (3x with backoff)
    console.log("Network error, retrying...");
  } else if (err.code === "INSUFFICIENT_BALANCE") {
    // User action required
    throw new Error("Insufficient balance to execute swap");
  }
}
```

### Approval Handling

```typescript
const { execute, approveSignature } = useAgent();

const result = await execute("swap_token", params);

if (result.status === ExecutionStatus.APPROVAL_REQUIRED) {
  // Collect user signature
  const signed = await wallet.signMessage(result.message);
  
  // Submit approval
  await approveSignature(result.approvalId, signed);
}
```

## Performance Tips

### 1. Reuse ExecutionCoordinator

```typescript
// ❌ Bad: Creates new instance each time
const coordinator1 = new ExecutionCoordinator(rpc);
const coordinator2 = new ExecutionCoordinator(rpc);

// ✅ Good: Reuse instance
const coordinator = new ExecutionCoordinator(rpc);
await coordinator.executeStrategy(...);
await coordinator.executeStrategy(...);
```

### 2. Batch Related Operations

```typescript
// ❌ Bad: Sequential execution
const meta = await analysisAgent.analyzeTokenSafety(...);
const distribution = await lookupAgent.fetchHolderDistribution(...);

// ✅ Good: Parallel execution
const [meta, distribution] = await Promise.all([
  analysisAgent.analyzeTokenSafety(...),
  lookupAgent.fetchHolderDistribution(...)
]);
```

### 3. Use Polling for Long Operations

```typescript
// ❌ Bad: Blocks UI
await execute("rebalance_portfolio", params);

// ✅ Good: Non-blocking with progress
execute("rebalance_portfolio", params);
// Use onProgress callback for UI updates
```

## Testing

### Mock Agent Execution

```typescript
import { ExecutionStatus } from "@/lib/agents";

// Mock response
const mockResult = {
  executionId: "test_123",
  status: ExecutionStatus.SUCCESS,
  progress: 100,
  result: { transactionSignature: "..." }
};

// In tests
jest.mock("@/hooks/use-agent", () => ({
  useAgent: () => ({
    execute: jest.fn().mockResolvedValue(mockResult),
    loading: false,
    error: null
  })
}));
```

## Debugging

### Enable Verbose Logging

```typescript
// In your component
const { execute } = useAgent({
  onStatusChange: (status) => {
    console.log("[Agent] Status:", status);
  },
  onProgress: (progress) => {
    console.log("[Agent] Progress:", progress);
  }
});
```

### Inspect Execution Context

```typescript
const coordinator = new ExecutionCoordinator(rpc);
const result = await coordinator.executeStrategy(...);

// Result includes execution context
console.log("Full context:", result);
console.log("Steps taken:", result.steps);
console.log("Cache hits:", result.cacheHits);
```

## Common Pitfalls

### ❌ Pitfall 1: Missing Public Key
```typescript
// This will fail
await execute("swap_token", params);
// Missing: userPublicKey in hook options
```

### ✅ Fix
```typescript
const { execute } = useAgent({
  userPublicKey: wallet.publicKey  // Required
});
```

### ❌ Pitfall 2: Wrong Amount Units
```typescript
// This tries to swap 1 SOL in lamports (1 lamport = 1 SOL?)
await execute("swap_token", {
  amount: 1  // Should be in smallest unit (lamports)
});
```

### ✅ Fix
```typescript
const USDC_DECIMALS = 6;
const amount = 100 * (10 ** USDC_DECIMALS);  // 100 USDC in lamports
await execute("swap_token", { amount });
```

### ❌ Pitfall 3: Not Handling Approval

```typescript
// Execution may require approval but you're not handling it
const result = await execute("swap_token", params);
```

### ✅ Fix
```typescript
if (result.status === ExecutionStatus.APPROVAL_REQUIRED) {
  const signed = await wallet.signMessage(result.message);
  await approveSignature(result.approvalId, signed);
}
```

## API Reference

### useAgent Options

```typescript
interface UseAgentOptions {
  userPublicKey?: PublicKey;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: ExecutionStatus) => void;
}
```

### useAgent Return

```typescript
{
  // State
  loading: boolean;
  error: string | null;
  executionId: string | null;
  result: any;
  progress: number;
  status: ExecutionStatus | null;

  // Methods
  execute: (strategy: StrategyType, input: any) => Promise<any>;
  cancel: () => Promise<void>;
  approveSignature: (approvalId: string, signature: string) => Promise<any>;
  rejectSignature: (approvalId: string) => Promise<any>;
  pollStatus: (executionId: string) => void;
  reset: () => void;
}
```

## Next Steps

1. **Integrate with Dashboard**: Add `AgentExecutor` component to main dashboard
2. **Create Monitoring UI**: Build execution history and status display
3. **Add Notifications**: Implement push notifications for approvals
4. **Performance Monitoring**: Track execution times and cache hit rates
5. **Error Analytics**: Log errors for debugging and optimization
