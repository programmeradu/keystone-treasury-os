"use client";

import { useState, useEffect, useCallback } from "react";
import { ExecutionStatus } from "@/lib/agents";

interface ActiveExecution {
  executionId: string;
  strategy: string;
  status: ExecutionStatus;
  progress: number;
  startTime: number;
}

interface ExecutionDashboardProps {
  onExecutionClick?: (executionId: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const statusColors = {
  [ExecutionStatus.PENDING]: "from-gray-500 to-gray-600",
  [ExecutionStatus.RUNNING]: "from-blue-500 to-blue-600",
  [ExecutionStatus.SIMULATION]: "from-purple-500 to-purple-600",
  [ExecutionStatus.APPROVAL_REQUIRED]: "from-yellow-500 to-yellow-600",
  [ExecutionStatus.APPROVED]: "from-green-500 to-green-600",
  [ExecutionStatus.EXECUTING]: "from-blue-600 to-blue-700",
  [ExecutionStatus.CONFIRMING]: "from-cyan-500 to-cyan-600",
  [ExecutionStatus.SUCCESS]: "from-green-600 to-green-700",
  [ExecutionStatus.FAILED]: "from-red-600 to-red-700",
  [ExecutionStatus.CANCELLED]: "from-gray-600 to-gray-700"
};

const statusIcons = {
  [ExecutionStatus.PENDING]: "⏳",
  [ExecutionStatus.RUNNING]: "▶",
  [ExecutionStatus.SIMULATION]: "🔍",
  [ExecutionStatus.APPROVAL_REQUIRED]: "⚠️",
  [ExecutionStatus.APPROVED]: "✓",
  [ExecutionStatus.EXECUTING]: "⚙️",
  [ExecutionStatus.CONFIRMING]: "📝",
  [ExecutionStatus.SUCCESS]: "✅",
  [ExecutionStatus.FAILED]: "❌",
  [ExecutionStatus.CANCELLED]: "⏹️"
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
 * Real-time execution monitoring dashboard
 */
export function ExecutionDashboard({
  onExecutionClick,
  autoRefresh = true,
  refreshInterval = 2000
}: ExecutionDashboardProps) {
  const [activeExecutions, setActiveExecutions] = useState<ActiveExecution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveExecutions = useCallback(async () => {
    try {
      // In a real implementation, this would fetch from a WebSocket or Server-Sent Events
      // For now, we'll assume the frontend maintains this state
      // You could fetch from /api/agentic/active or similar
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch active executions:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveExecutions();

    if (autoRefresh) {
      const interval = setInterval(fetchActiveExecutions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchActiveExecutions]);

  const handleCancel = async (executionId: string) => {
    try {
      const response = await fetch(`/api/agentic?executionId=${executionId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setActiveExecutions(activeExecutions.filter(e => e.executionId !== executionId));
      }
    } catch (error) {
      console.error("Failed to cancel execution:", error);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          Active Executions ({activeExecutions.length})
        </h2>
        {autoRefresh && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-400">Live</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading active executions...</p>
        </div>
      ) : activeExecutions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No active executions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeExecutions.map((exec) => (
            <ExecutionCard
              key={exec.executionId}
              execution={exec}
              onCancel={handleCancel}
              onClick={onExecutionClick}
            />
          ))}
        </div>
      )}

      {/* Queue Summary */}
      {activeExecutions.length > 0 && (
        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total"
              value={activeExecutions.length.toString()}
              color="blue"
            />
            <StatCard
              label="Running"
              value={activeExecutions.filter(e => e.status === ExecutionStatus.RUNNING).length.toString()}
              color="cyan"
            />
            <StatCard
              label="Pending"
              value={activeExecutions.filter(e => e.status === ExecutionStatus.PENDING).length.toString()}
              color="gray"
            />
            <StatCard
              label="Approval"
              value={activeExecutions.filter(e => e.status === ExecutionStatus.APPROVAL_REQUIRED).length.toString()}
              color="yellow"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual execution card
 */
function ExecutionCard({
  execution,
  onCancel,
  onClick
}: {
  execution: ActiveExecution;
  onCancel: (id: string) => void;
  onClick?: (id: string) => void;
}) {
  const statusGradient = statusColors[execution.status];
  const statusIcon = statusIcons[execution.status];
  const strategyLabel = strategyLabels[execution.strategy as keyof typeof strategyLabels] || execution.strategy;
  const elapsedSeconds = Math.floor((Date.now() - execution.startTime) / 1000);

  const isActive =
    execution.status === ExecutionStatus.RUNNING ||
    execution.status === ExecutionStatus.EXECUTING ||
    execution.status === ExecutionStatus.CONFIRMING;

  const canCancel =
    execution.status !== ExecutionStatus.SUCCESS &&
    execution.status !== ExecutionStatus.FAILED &&
    execution.status !== ExecutionStatus.CANCELLED;

  return (
    <div
      className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors cursor-pointer"
      onClick={() => onClick?.(execution.executionId)}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">{statusIcon}</span>
            <div>
              <p className="font-semibold text-white">{strategyLabel}</p>
              <p className="text-xs text-slate-400">ID: {execution.executionId.slice(0, 12)}...</p>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium text-white bg-gradient-to-r ${statusGradient}`}>
            {execution.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Progress</span>
            <span className="text-slate-300 font-medium">{execution.progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${statusGradient} transition-all duration-500`}
              style={{ width: `${execution.progress}%` }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900 rounded p-2">
            <p className="text-slate-400">Elapsed</p>
            <p className="text-slate-200 font-medium">{elapsedSeconds}s</p>
          </div>
          <div className="bg-slate-900 rounded p-2">
            <p className="text-slate-400">Status</p>
            <p className="text-slate-200 font-medium">{execution.progress}%</p>
          </div>
        </div>

        {/* Actions */}
        {canCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel(execution.executionId);
            }}
            className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded text-red-300 text-sm font-medium transition-colors"
          >
            Cancel Execution
          </button>
        )}

        {execution.status === ExecutionStatus.APPROVAL_REQUIRED && (
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="w-full px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 rounded text-yellow-300 text-sm font-medium transition-colors"
          >
            Requires Approval
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Statistics card
 */
function StatCard({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color: "blue" | "cyan" | "gray" | "yellow";
}) {
  const colorMap = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    cyan: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
    gray: "bg-gray-500/10 border-gray-500/30 text-gray-300",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
  };

  return (
    <div className={`border rounded p-3 ${colorMap[color]}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default ExecutionDashboard;
