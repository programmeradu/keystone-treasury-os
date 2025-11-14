import { useState, useCallback } from "react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { ExecutionStatus, StrategyType } from "@/lib/agents";
import RealTransactionService from "@/lib/wallet/real-transaction-service";
import JupiterService from "@/lib/wallet/jupiter-service";

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
 * Hook for executing strategies via the agent API with real wallet signing
 */
export function useAgent(options: UseAgentOptions = {}) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ExecutionStatus | null>(null);

  const transactionService = new RealTransactionService();
  const jupiterService = new JupiterService();

  /**
   * Execute a strategy
   */
  const execute = useCallback(
    async (strategy: StrategyType, input: any) => {
      if (!options.userPublicKey && !wallet.publicKey) {
        const msg = "Wallet not connected";
        setError(msg);
        throw new Error(msg);
      }

      setLoading(true);
      setError(null);
      setProgress(0);

      try {
        const userPubKey = options.userPublicKey || wallet.publicKey;

        // Step 1: Call agent API to prepare strategy
        const response = await fetch("/api/agentic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategy,
            input,
            userPublicKey: userPubKey?.toBase58()
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

        // Step 2: If approval required, show wallet dialog and sign
        if (data.status === ExecutionStatus.APPROVAL_REQUIRED && data.result?.swap_result) {
          if (!wallet.signTransaction) {
            throw new Error("Wallet does not support signing");
          }

          setProgress(75);
          setStatus(ExecutionStatus.EXECUTING);

          try {
            // Get the swap quote and build transaction
            const swapQuote = data.result.swap_quote;
            const swapResult = data.result.swap_result;

            // Get swap instructions from Jupiter
            const swapInstructions = await jupiterService.getSwapInstructions(
              swapQuote,
              userPubKey!
            );

            // Parse the transaction
            const swappedTx = await jupiterService.parseSwapTransaction(swapInstructions.swapTransaction);

            // Build versioned transaction
            const tx = await transactionService.buildTransaction(
              swappedTx.instructions,
              userPubKey!
            );

            // Sign with wallet
            const signedTx = await wallet.signTransaction!(tx as VersionedTransaction);

            // Send transaction
            setProgress(85);
            const signature = await transactionService.sendTransaction(signedTx, userPubKey ?? undefined);

            // Wait for confirmation
            setProgress(95);
            const confirmationResult = await transactionService.waitForConfirmation(signature);

            // Update result
            setProgress(100);
            setStatus(ExecutionStatus.SUCCESS);
            setResult({
              ...data.result,
              transactionSignature: confirmationResult.signature,
              confirmationStatus: confirmationResult.status,
              fee: confirmationResult.fee
            });

            return {
              executionId: data.executionId,
              status: ExecutionStatus.SUCCESS,
              progress: 100,
              result: {
                ...data.result,
                transactionSignature: confirmationResult.signature,
                confirmationStatus: confirmationResult.status,
                fee: confirmationResult.fee
              }
            };
          } catch (signError: any) {
            setStatus(ExecutionStatus.FAILED);
            setError(signError.message);
            throw signError;
          }
        }

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
    [options, wallet, transactionService, jupiterService]
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

