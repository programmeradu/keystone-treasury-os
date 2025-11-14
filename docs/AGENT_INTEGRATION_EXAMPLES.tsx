// Example: How to integrate AgentExecutor into your main dashboard
// This shows where and how to add the agent system to existing pages

import { AgentExecutor } from "@/components/AgentExecutor";
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { useState } from "react";

/**
 * Example 1: Add AgentExecutor to an existing dashboard
 */
export function DashboardWithAgents() {
  const { publicKey } = useWallet();
  const [agentResult, setAgentResult] = useState<any>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Existing dashboard content */}
      <div className="lg:col-span-2">
        {/* Your existing components here */}
      </div>

      {/* Add agent system */}
      <div className="lg:col-span-1">
        <AgentExecutor
          walletPublicKey={publicKey ?? undefined}
          onSuccess={(result) => {
            setAgentResult(result);
            setAgentError(null);
          }}
          onError={(error) => {
            setAgentError(error);
            setAgentResult(null);
          }}
        />
      </div>
    </div>
  );
}

/**
 * Example 2: Create a dedicated agents page
 */
export function AgentsPage() {
  const { publicKey } = useWallet();
  const [agents, setAgents] = useState<any[]>([]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">Autonomous Agents</h1>
        <p className="text-slate-400">
          Execute complex blockchain operations with AI-powered agents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent executor on left */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Execute Strategy</h2>
          <AgentExecutor
            walletPublicKey={publicKey ?? undefined}
            onSuccess={(result) => {
              setAgents([result, ...agents]);
            }}
          />
        </div>

        {/* Execution history on right */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Executions</h2>
          <div className="space-y-3 max-h-96 overflow-auto">
            {agents.map((agent, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-800 border border-slate-700 rounded"
              >
                <p className="text-sm text-slate-300">
                  {agent.status}: {agent.strategy}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(agent.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 3: Integrate agents into an existing tool
 */
import { useAgent } from "@/hooks/use-agent";

export function EnhancedJupiterTool() {
  const { publicKey } = useWallet();
  const [useAgent, setUseAgent] = useState(true);

  if (useAgent && publicKey) {
    return <AgentJupiterSwap wallet={publicKey} />;
  }

  return publicKey ? <TraditionalJupiterSwap wallet={publicKey} /> : null;
}

/**
 * Jupiter swap enhanced with agents
 */
function AgentJupiterSwap({ wallet }: { wallet: PublicKey }) {
  const { execute, loading, progress, error, result } = useAgent({
    userPublicKey: wallet
  });

  const handleSwap = async (inputMint: string, outputMint: string, amount: number) => {
    try {
      const result = await execute("swap_token" as any, {
        inputMint,
        outputMint,
        amount,
        slippage: 0.5
      });

      console.log("Swap executed:", result);
    } catch (err) {
      console.error("Swap failed:", err);
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4">Jupiter Swap (Agent-Powered)</h2>

      {/* Your swap UI here */}
      <button
        onClick={() => handleSwap("EPjFWdd5Au", "So11111111111111111111111111111111111111112", 1000000)}
        disabled={loading}
      >
        {loading ? `Swapping... ${progress}%` : "Swap"}
      </button>

      {error && <p className="text-red-400 mt-4">{error}</p>}
      {result && <pre className="text-xs text-green-400 mt-4">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

/**
 * Example 4: Multi-step strategy using agents
 */
import { ExecutionStatus } from "@/lib/agents";

export function AutoRebalanceStrategy() {
  const { publicKey } = useWallet();
  const { execute, progress, status } = useAgent({
    userPublicKey: publicKey ?? undefined,
    onProgress: (p) => console.log(`Progress: ${p}%`),
    onStatusChange: (s) => console.log(`Status: ${s}`)
  });

  const autoRebalance = async () => {
    try {
      // Step 1: Analyze current holdings
      const currentState = await execute("analyze_token_safety" as any, {
        tokenMint: "So11111111111111111111111111111111111111112"
      });

      // Step 2: If safe, analyze portfolio risk
      if (currentState.result?.riskLevel !== "high_risk") {
        const riskAnalysis = await execute("detect_mev" as any, {
          walletAddress: publicKey!.toBase58(),
          lookbackMinutes: 60
        });

        // Step 3: Based on analysis, execute rebalance
        if (riskAnalysis.result?.opportunities) {
          await execute("rebalance_portfolio" as any, {
            currentAllocations: { SOL: 0.5, USDC: 0.5 },
            targetAllocations: { SOL: 0.6, USDC: 0.4 },
            rebalanceType: "weighted"
          });
        }
      }
    } catch (err) {
      console.error("Auto-rebalance failed:", err);
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Auto-Rebalance</h2>

      <button
        onClick={autoRebalance}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
      >
        Start Auto-Rebalance
      </button>

      <div className="mt-4">
        <p className="text-slate-300">Progress: {progress}%</p>
        <p className="text-slate-400">Status: {status || "idle"}</p>
      </div>
    </div>
  );
}

/**
 * Example 5: Create a strategy builder
 */
interface StrategyStep {
  id: string;
  strategy: string;
  input: Record<string, any>;
  completed: boolean;
}

export function StrategyBuilder() {
  const { publicKey } = useWallet();
  const { execute } = useAgent({ userPublicKey: publicKey ?? undefined });
  const [steps, setSteps] = useState<StrategyStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const executeStrategy = async () => {
    for (let i = currentStep; i < steps.length; i++) {
      const step = steps[i];

      try {
        await execute(step.strategy as any, step.input);

        // Mark as completed
        const updated = [...steps];
        updated[i] = { ...step, completed: true };
        setSteps(updated);
        setCurrentStep(i + 1);
      } catch (err) {
        console.error(`Step ${i} failed:`, err);
        break;
      }
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Strategy Builder</h2>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`p-4 rounded border ${step.completed ? "bg-green-500/20 border-green-500" : "bg-slate-800 border-slate-700"}`}
          >
            <p className="font-medium text-white">Step {idx + 1}: {step.strategy}</p>
            {step.completed && <p className="text-green-400 text-sm">✓ Completed</p>}
          </div>
        ))}
      </div>

      <button
        onClick={executeStrategy}
        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
      >
        Execute Strategy
      </button>
    </div>
  );
}

/**
 * Example 6: Real-time execution monitor
 */
export function ExecutionMonitor() {
  const { publicKey } = useWallet();
  const [executions, setExecutions] = useState<any[]>([]);

  const { execute } = useAgent({
    userPublicKey: publicKey ?? undefined,
    onStatusChange: (status) => {
      // Update executions list
      console.log("Status changed:", status);
    }
  });

  return (
    <div className="p-6 bg-slate-900 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Execution Monitor</h2>

      <div className="space-y-3 max-h-96 overflow-auto">
        {executions.map((exec) => (
          <div key={exec.executionId} className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium text-white">{exec.strategy}</p>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  exec.status === ExecutionStatus.SUCCESS
                    ? "bg-green-500/20 text-green-400"
                    : exec.status === ExecutionStatus.FAILED
                      ? "bg-red-500/20 text-red-400"
                      : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {exec.status}
              </span>
            </div>

            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${exec.progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{exec.progress}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Placeholders for traditional implementations
 */
function TraditionalJupiterSwap({ wallet }: { wallet: PublicKey }) {
  return <div>Traditional Jupiter Swap Component</div>;
}

export default DashboardWithAgents;
