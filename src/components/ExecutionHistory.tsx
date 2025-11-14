"use client";

import { useState, useEffect } from "react";
import { ExecutionStatus } from "@/lib/agents";
import { formatDistanceToNow } from "date-fns";

interface Execution {
  id: string;
  strategy: string;
  status: string;
  progress: number;
  result?: any;
  error?: string;
  actualGas?: number;
  transactionSignature?: string;
  duration?: number;
  createdAt: number;
  completedAt?: number;
}

interface ExecutionHistoryProps {
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

const statusColors = {
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

const strategyLabels = {
  swap_token: "Token Swap",
  rebalance_portfolio: "Rebalance",
  stake_sol: "Stake SOL",
  analyze_token_safety: "Token Analysis",
  detect_mev: "MEV Detection",
  execute_dca: "DCA Execution",
  optimize_fees: "Fee Optimization"
};

/**
 * ExecutionHistory component - displays past executions with filtering
 */
export function ExecutionHistory({
  limit = 20,
  showFilters = true,
  compact = false
}: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/agentic/history?limit=${limit}&offset=0`
      );
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      }
    } catch (error) {
      console.error("Failed to load execution history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExecutions = filter
    ? executions.filter((e) => e.strategy === filter || e.status === filter)
    : executions;

  const sortedExecutions = [...filteredExecutions].sort((a, b) => {
    if (sortBy === "newest") {
      return b.createdAt - a.createdAt;
    }
    return a.createdAt - b.createdAt;
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">Recent Executions</h3>
        <div className="space-y-1 max-h-48 overflow-auto">
          {sortedExecutions.slice(0, 5).map((exec) => (
            <ExecutionRow key={exec.id} execution={exec} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Execution History</h2>
        <button
          onClick={loadExecutions}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
        >
          Refresh
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Filter by Status
            </label>
            <select
              value={filter || ""}
              onChange={(e) => setFilter(e.target.value || null)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
            >
              <option value="">All Statuses</option>
              <option value={ExecutionStatus.SUCCESS}>Success</option>
              <option value={ExecutionStatus.FAILED}>Failed</option>
              <option value={ExecutionStatus.RUNNING}>Running</option>
              <option value={ExecutionStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Filter by Strategy
            </label>
            <select
              value={filter || ""}
              onChange={(e) => setFilter(e.target.value || null)}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
            >
              <option value="">All Strategies</option>
              <option value="swap_token">Token Swap</option>
              <option value="rebalance_portfolio">Rebalance</option>
              <option value="stake_sol">Stake SOL</option>
              <option value="analyze_token_safety">Token Analysis</option>
              <option value="detect_mev">MEV Detection</option>
              <option value="execute_dca">DCA Execution</option>
              <option value="optimize_fees">Fee Optimization</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading executions...</p>
        </div>
      ) : sortedExecutions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No executions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExecutions.map((execution) => (
            <ExecutionRow key={execution.id} execution={execution} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual execution row component
 */
function ExecutionRow({ execution }: { execution: Execution }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    statusColors[execution.status as keyof typeof statusColors] ||
    "bg-gray-500";
  const strategyLabel =
    strategyLabels[execution.strategy as keyof typeof strategyLabels] ||
    execution.strategy;

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50">
      <div
        className="p-4 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="font-medium text-white">{strategyLabel}</span>
              <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                {execution.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {formatDistanceToNow(new Date(execution.createdAt), {
                addSuffix: true
              })}
            </p>
          </div>

          <div className="text-right">
            {execution.actualGas && (
              <p className="text-sm text-slate-300">
                ◎ {execution.actualGas.toFixed(6)} SOL
              </p>
            )}
            {execution.duration && (
              <p className="text-xs text-slate-400">
                {(execution.duration / 1000).toFixed(1)}s
              </p>
            )}
          </div>

          <div className="w-6 h-6 flex items-center justify-center">
            {expanded ? "▼" : "▶"}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700 bg-slate-900/50 p-4 space-y-3">
          <ExecutionDetails execution={execution} />
        </div>
      )}
    </div>
  );
}

/**
 * Execution details component
 */
function ExecutionDetails({ execution }: { execution: Execution }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400">ID</p>
          <p className="text-slate-200 font-mono text-xs break-all">
            {execution.id}
          </p>
        </div>

        {execution.transactionSignature && (
          <div>
            <p className="text-slate-400">Transaction</p>
            <a
              href={`https://solscan.io/tx/${execution.transactionSignature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono text-xs break-all"
            >
              View on Solscan
            </a>
          </div>
        )}
      </div>

      {execution.result && (
        <div>
          <p className="text-slate-400 mb-2">Result</p>
          <pre className="bg-slate-900 border border-slate-700 rounded p-3 overflow-auto text-xs max-h-32 text-slate-300">
            {JSON.stringify(execution.result, null, 2)}
          </pre>
        </div>
      )}

      {execution.error && (
        <div>
          <p className="text-slate-400 mb-2">Error</p>
          <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-red-200 text-xs">
            {execution.error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-xs">
        {execution.actualGas && (
          <div>
            <p className="text-slate-400">Gas Used</p>
            <p className="text-slate-200">◎ {execution.actualGas.toFixed(6)} SOL</p>
          </div>
        )}

        {execution.duration && (
          <div>
            <p className="text-slate-400">Duration</p>
            <p className="text-slate-200">
              {(execution.duration / 1000).toFixed(1)}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionHistory;
