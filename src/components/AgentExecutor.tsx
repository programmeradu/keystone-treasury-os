import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAgent } from "@/hooks/use-agent";
import { ExecutionStatus } from "@/lib/agents";

interface AgentExecutorProps {
  walletPublicKey?: PublicKey;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

/**
 * Example component demonstrating agent system usage
 */
export function AgentExecutor({
  walletPublicKey,
  onSuccess,
  onError
}: AgentExecutorProps) {
  const [strategy, setStrategy] = useState<string>("swap_token");
  const [tokenMint, setTokenMint] = useState("");
  const [amount, setAmount] = useState("");

  const {
    loading,
    error,
    progress,
    status,
    result,
    execute,
    cancel,
    reset
  } = useAgent({
    userPublicKey: walletPublicKey,
    onProgress: (p) => console.log(`Progress: ${p}%`),
    onStatusChange: (s) => console.log(`Status: ${s}`)
  });

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletPublicKey) {
      onError?.("Wallet not connected");
      return;
    }

    try {
      let input: any = {};

      switch (strategy) {
        case "swap_token":
          input = {
            inputMint: "EPjFWdd5Au",
            outputMint: tokenMint,
            amount: parseInt(amount) * 10 ** 6
          };
          break;

        case "analyze_token_safety":
          input = {
            tokenMint: tokenMint
          };
          break;

        case "detect_mev":
          input = {
            walletAddress: walletPublicKey.toBase58(),
            lookbackMinutes: 60
          };
          break;

        default:
          input = {};
      }

      const result = await execute(strategy as any, input);
      onSuccess?.(result);
    } catch (err: any) {
      onError?.(err.message);
    }
  };

  const statusColor = {
    [ExecutionStatus.PENDING]: "bg-gray-500",
    [ExecutionStatus.RUNNING]: "bg-blue-500",
    [ExecutionStatus.SIMULATION]: "bg-purple-500",
    [ExecutionStatus.APPROVAL_REQUIRED]: "bg-yellow-500",
    [ExecutionStatus.APPROVED]: "bg-green-500",
    [ExecutionStatus.EXECUTING]: "bg-blue-600",
    [ExecutionStatus.CONFIRMING]: "bg-cyan-500",
    [ExecutionStatus.SUCCESS]: "bg-green-600",
    [ExecutionStatus.FAILED]: "bg-red-600",
    [ExecutionStatus.CANCELLED]: "bg-gray-600"
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white">Agent Executor</h2>

      {!walletPublicKey && (
        <div className="p-4 bg-yellow-500/20 border border-yellow-500 rounded text-yellow-200">
          Please connect your wallet to use agents
        </div>
      )}

      <form onSubmit={handleExecute} className="space-y-4">
        {/* Strategy Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Strategy
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white disabled:opacity-50"
          >
            <option value="swap_token">Swap Token</option>
            <option value="rebalance_portfolio">Rebalance Portfolio</option>
            <option value="stake_sol">Stake SOL</option>
            <option value="analyze_token_safety">Analyze Token Safety</option>
            <option value="detect_mev">Detect MEV</option>
            <option value="execute_dca">Execute DCA</option>
            <option value="optimize_fees">Optimize Fees</option>
          </select>
        </div>

        {/* Token Mint Input */}
        {["swap_token", "analyze_token_safety"].includes(strategy) && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Token Mint
            </label>
            <input
              type="text"
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value)}
              placeholder="Enter token mint address"
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
        )}

        {/* Amount Input */}
        {strategy === "swap_token" && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Amount (in tokens)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {/* Status Display */}
        {status && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Status:</span>
              <span
                className={`px-3 py-1 rounded text-white text-sm font-medium ${statusColor[status] || "bg-gray-500"}`}
              >
                {status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-xs text-slate-400">Progress: {progress}%</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || !walletPublicKey}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-medium transition-colors"
          >
            {loading ? "Executing..." : "Execute"}
          </button>

          {status && status !== ExecutionStatus.SUCCESS && status !== ExecutionStatus.FAILED && (
            <button
              type="button"
              onClick={cancel}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
            >
              Cancel
            </button>
          )}

          {(status === ExecutionStatus.SUCCESS || status === ExecutionStatus.FAILED) && (
            <button
              type="button"
              onClick={reset}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Result Display */}
      {result && (
        <div className="p-4 bg-slate-800 border border-slate-600 rounded space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Result</h3>
          <pre className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900 p-3 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default AgentExecutor;
