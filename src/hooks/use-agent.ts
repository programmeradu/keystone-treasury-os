import { useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { ExecutionStatus, StrategyType } from "@/lib/agents";

interface UseAgentOptions {
  userPublicKey?: PublicKey;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: ExecutionStatus) => void;
}

interface AgentExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  progress: number;
  result?: any;
  error?: string;
}

/**
 * Hook for executing strategies via the agent API
 */
export function useAgent(options: UseAgentOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ExecutionStatus | null>(null);

  /**
   * Execute a strategy
   */
  const execute = useCallback(
    async (strategy: StrategyType, input: any) => {
      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const response = await fetch("/api/agentic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategy,
            input,
            userPublicKey: options.userPublicKey?.toBase58()
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Execution failed");
        }

        const data: AgentExecutionResult = await response.json();
        setExecutionId(data.executionId);
        setStatus(data.status);
        setProgress(data.progress);
        setResult(data.result);

        options.onStatusChange?.(data.status);

        // Poll for updates if still executing
        if (
          data.status !== ExecutionStatus.SUCCESS &&
          data.status !== ExecutionStatus.FAILED &&
          data.status !== ExecutionStatus.CANCELLED
        ) {
          pollStatus(data.executionId);
        }

        return data;
      } catch (err: any) {
        const msg = err.message || "Execution failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  /**
   * Poll for execution status
   */
  const pollStatus = useCallback(async (id: string) => {
    let attempts = 0;
    const maxAttempts = 300; // 5 minutes with 1s polling

    const poll = async () => {
      try {
        const response = await fetch(`/api/agentic?executionId=${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Execution not found");
            return;
          }
          throw new Error("Status check failed");
        }

        const data: AgentExecutionResult = await response.json();
        setStatus(data.status);
        setProgress(data.progress);
        setResult(data.result);

        options.onProgress?.(data.progress);
        options.onStatusChange?.(data.status);

        // Continue polling if not in final state
        const isFinal =
          data.status === ExecutionStatus.SUCCESS ||
          data.status === ExecutionStatus.FAILED ||
          data.status === ExecutionStatus.CANCELLED;

        if (!isFinal && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 1000);
        } else if (attempts >= maxAttempts) {
          setError("Execution timeout");
        }
      } catch (err: any) {
        setError(err.message || "Status check failed");
      }
    };

    poll();
  }, [options]);

  /**
   * Cancel execution
   */
  const cancel = useCallback(async () => {
    if (!executionId) {
      setError("No active execution");
      return;
    }

    try {
      const response = await fetch(
        `/api/agentic?executionId=${executionId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Cancellation failed");
      }

      setStatus(ExecutionStatus.CANCELLED);
      options.onStatusChange?.(ExecutionStatus.CANCELLED);
    } catch (err: any) {
      setError(err.message || "Cancellation failed");
    }
  }, [executionId, options]);

  /**
   * Approve signature request
   */
  const approveSignature = useCallback(
    async (approvalId: string, signature: string) => {
      try {
        const response = await fetch("/api/agentic/approve", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvalId,
            approved: true,
            signature
          })
        });

        if (!response.ok) {
          throw new Error("Approval failed");
        }

        return await response.json();
      } catch (err: any) {
        setError(err.message || "Approval failed");
        throw err;
      }
    },
    []
  );

  /**
   * Reject signature request
   */
  const rejectSignature = useCallback(async (approvalId: string) => {
    try {
      const response = await fetch("/api/agentic/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          approved: false
        })
      });

      if (!response.ok) {
        throw new Error("Rejection failed");
      }

      return await response.json();
    } catch (err: any) {
      setError(err.message || "Rejection failed");
      throw err;
    }
  }, []);

  return {
    // State
    loading,
    error,
    executionId,
    result,
    progress,
    status,

    // Methods
    execute,
    cancel,
    approveSignature,
    rejectSignature,
    pollStatus,

    // Reset
    reset: () => {
      setLoading(false);
      setError(null);
      setExecutionId(null);
      setResult(null);
      setProgress(0);
      setStatus(null);
    }
  };
}

export type { UseAgentOptions, AgentExecutionResult };
