import { ExecutionStatus, StrategyType } from "@/lib/agents";
import { PublicKey } from "@solana/web3.js";

interface AtlasAgentIntegration {
  executeAtlasTool: (
    toolId: string,
    params: Record<string, any>,
    userPublicKey: PublicKey
  ) => Promise<any>;
  
  mapToolToStrategy: (
    toolId: string
  ) => StrategyType | null;

  formatAgentResult: (
    strategy: StrategyType,
    result: any
  ) => string;
}

/**
 * Maps atlas tools to agent strategies
 * Allows existing atlas tools to leverage the agent system
 */
export const atlasToolToAgentMap: Record<string, StrategyType> = {
  // Existing tools that can be enhanced with agents
  "swap-token": StrategyType.SWAP_TOKEN,
  "jupiter-swap": StrategyType.SWAP_TOKEN,
  "rebalance": StrategyType.REBALANCE_PORTFOLIO,
  "staking": StrategyType.STAKE_SOL,
  "token-safety": StrategyType.ANALYZE_TOKEN_SAFETY,
  "mev-detect": StrategyType.DETECT_MEV,
  "dca": StrategyType.EXECUTE_DCA,
  "fee-optimizer": StrategyType.OPTIMIZE_FEES
};

/**
 * Maps tool parameters to agent input format
 */
function mapToolParamsToAgentInput(
  toolId: string,
  params: Record<string, any>
): Record<string, any> {
  const strategy = mapToolToStrategy(toolId);

  if (!strategy) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  switch (strategy) {
    case StrategyType.SWAP_TOKEN:
      return {
        inputMint: params.inputMint || params.from,
        outputMint: params.outputMint || params.to,
        amount: params.amount || params.inputAmount,
        slippage: params.slippage || 0.5
      };

    case StrategyType.REBALANCE_PORTFOLIO:
      return {
        currentAllocations: params.currentAllocations || {},
        targetAllocations: params.targetAllocations || {},
        rebalanceType: params.rebalanceType || "weighted"
      };

    case StrategyType.STAKE_SOL:
      return {
        amount: params.amount,
        validatorVoteAccount: params.validator,
        autoCompound: params.autoCompound !== false
      };

    case StrategyType.ANALYZE_TOKEN_SAFETY:
      return {
        tokenMint: params.tokenMint || params.token,
        includeDistribution: params.includeDistribution !== false
      };

    case StrategyType.DETECT_MEV:
      return {
        walletAddress: params.walletAddress,
        lookbackMinutes: params.lookbackMinutes || 60
      };

    case StrategyType.EXECUTE_DCA:
      return {
        inputMint: params.inputMint || params.from,
        outputMint: params.outputMint || params.to,
        totalAmount: params.totalAmount || params.amount,
        frequency: params.frequency || "daily",
        duration: params.duration || 30
      };

    case StrategyType.OPTIMIZE_FEES:
      return {
        walletAddress: params.walletAddress,
        timeframe: params.timeframe || 90
      };

    default:
      return params;
  }
}

/**
 * Formats agent execution result into human-readable atlas tool format
 */
function formatAgentResultForAtlas(
  strategy: StrategyType,
  result: any
): string {
  if (!result) {
    return "Execution completed with no result";
  }

  switch (strategy) {
    case StrategyType.SWAP_TOKEN:
      if (result.transactionSignature) {
        return `Swap successful: ${result.transactionSignature}\nOutput: ${result.outputAmount} ${result.outputToken}`;
      }
      return `Swap route found: ${result.outputAmount} tokens`;

    case StrategyType.REBALANCE_PORTFOLIO:
      return `Rebalancing complete\nTransactions: ${result.operations?.length || 0}\nExpected cost: ${result.estimatedGas || "unknown"} SOL`;

    case StrategyType.STAKE_SOL:
      if (result.transactionSignature) {
        return `Staking successful: ${result.transactionSignature}\nStaked: ${result.amount} SOL`;
      }
      return `Staking ready: ${result.amount} SOL → ${result.validator}`;

    case StrategyType.ANALYZE_TOKEN_SAFETY:
      const risk = result.riskLevel || "unknown";
      const score = result.safetyScore || 0;
      const redFlags = result.redFlags || [];
      return `Safety Analysis: ${risk} (${score}/100)\nRed flags: ${redFlags.join(", ") || "none"}`;

    case StrategyType.DETECT_MEV:
      const opportunities = result.opportunities || [];
      return `MEV Detection: Found ${opportunities.length} opportunities\nPotential loss: ${result.estimatedLoss || "unknown"} SOL`;

    case StrategyType.EXECUTE_DCA:
      return `DCA Schedule: ${result.schedule?.length || 0} orders\nTotal: ${result.totalAmount} tokens`;

    case StrategyType.OPTIMIZE_FEES:
      const savings = result.potentialSavings || 0;
      return `Fee Optimization: Potential savings ${savings} SOL`;

    default:
      return JSON.stringify(result);
  }
}

/**
 * Get strategy type for a tool ID
 */
export function mapToolToStrategy(toolId: string): StrategyType | null {
  return atlasToolToAgentMap[toolId.toLowerCase()] || null;
}

/**
 * Execute an atlas tool using the agent system
 */
export async function executeAtlasTool(
  toolId: string,
  params: Record<string, any>,
  userPublicKey: PublicKey
): Promise<any> {
  const strategy = mapToolToStrategy(toolId);

  if (!strategy) {
    throw new Error(`Tool '${toolId}' cannot be executed via agents`);
  }

  const input = mapToolParamsToAgentInput(toolId, params);

  try {
    const response = await fetch("/api/agentic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategy,
        input,
        userPublicKey: userPublicKey.toBase58()
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Agent execution failed");
    }

    const result = await response.json();

    // Format result for atlas compatibility
    return {
      ...result,
      formattedResult: formatAgentResultForAtlas(strategy, result.result)
    };
  } catch (error: any) {
    throw new Error(`Failed to execute agent for tool '${toolId}': ${error.message}`);
  }
}

/**
 * Get execution status
 */
export async function getExecutionStatus(executionId: string): Promise<any> {
  const response = await fetch(`/api/agentic?executionId=${executionId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Execution not found");
    }
    throw new Error("Failed to get execution status");
  }

  return response.json();
}

/**
 * Cancel execution
 */
export async function cancelExecution(executionId: string): Promise<any> {
  const response = await fetch(`/api/agentic?executionId=${executionId}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to cancel execution");
  }

  return response.json();
}

/**
 * Check if a tool can be executed via agents
 */
export function canExecuteViaAgent(toolId: string): boolean {
  return mapToolToStrategy(toolId) !== null;
}

/**
 * Get list of all supported tools
 */
export function getSupportedAgentTools(): string[] {
  return Object.keys(atlasToolToAgentMap);
}

export const agentIntegration: AtlasAgentIntegration = {
  executeAtlasTool,
  mapToolToStrategy,
  formatAgentResult: formatAgentResultForAtlas
};
