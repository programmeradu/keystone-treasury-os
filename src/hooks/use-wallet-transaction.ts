"use client";

/**
 * useWalletTransaction Hook
 * Provides wallet signing, transaction building, and submission
 * Integrates with @solana/wallet-adapter-react
 */

import { useCallback, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { 
  WalletTransactionExecutor, 
  getWalletExecutor,
  type ApprovalRequest,
  type WalletTransactionResult
} from "@/lib/wallet/transaction-executor";

interface UseWalletTransactionOptions {
  rpcEndpoint?: string;
  autoSimulate?: boolean;
}

interface TransactionState {
  loading: boolean;
  signing: boolean;
  error: string | null;
  signature: string | null;
  confirmed: boolean;
  estimatedFee: number | null;
}

/**
 * Hook for wallet transaction operations
 */
export function useWalletTransaction(options: UseWalletTransactionOptions = {}) {
  const wallet = useWallet();
  const executor = getWalletExecutor(options.rpcEndpoint);
  const autoSimulate = options.autoSimulate !== false;

  const [state, setState] = useState<TransactionState>({
    loading: false,
    signing: false,
    error: null,
    signature: null,
    confirmed: false,
    estimatedFee: null
  });

  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);

  // Initialize wallet executor with current wallet
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      executor.setWallet(wallet as any);
    }
  }, [wallet.connected, wallet.publicKey, executor]);

  /**
   * Build and simulate a swap transaction
   */
  const buildSwapTransaction = useCallback(
    async (input: {
      inMint: string;
      outMint: string;
      amount: number;
      slippage?: number;
    }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const tx = await executor.buildSwapTransaction({
          ...input,
          userPublicKey: wallet.publicKey
        });

        // Simulate if enabled
        let estimatedFee = null;
        if (autoSimulate) {
          const simulation = await executor.simulateTransaction(tx);
          if (!simulation.success) {
            throw new Error(simulation.error || "Simulation failed");
          }
          estimatedFee = await executor.estimateFee(tx);
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          estimatedFee
        }));

        return { tx, estimatedFee };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to build swap transaction";
        setState((prev) => ({ ...prev, loading: false, error: errorMsg }));
        throw error;
      }
    },
    [wallet.publicKey, executor, autoSimulate]
  );

  /**
   * Build and simulate a stake transaction
   */
  const buildStakeTransaction = useCallback(
    async (input: {
      amount: number;
      stakePool?: string;
    }) => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const tx = await executor.buildStakeTransaction({
          ...input,
          userPublicKey: wallet.publicKey
        });

        let estimatedFee = null;
        if (autoSimulate) {
          const simulation = await executor.simulateTransaction(tx);
          if (!simulation.success) {
            throw new Error(simulation.error || "Simulation failed");
          }
          estimatedFee = await executor.estimateFee(tx);
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          estimatedFee
        }));

        return { tx, estimatedFee };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to build stake transaction";
        setState((prev) => ({ ...prev, loading: false, error: errorMsg }));
        throw error;
      }
    },
    [wallet.publicKey, executor, autoSimulate]
  );

  /**
   * Simulate a transaction
   */
  const simulateTransaction = useCallback(
    async (tx: Transaction | VersionedTransaction) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const result = await executor.simulateTransaction(tx);

        if (!result.success) {
          throw new Error(result.error || "Simulation failed");
        }

        const estimatedFee = await executor.estimateFee(tx);

        setState((prev) => ({
          ...prev,
          loading: false,
          estimatedFee
        }));

        return result;
      } catch (error: any) {
        const errorMsg = error.message || "Simulation failed";
        setState((prev) => ({ ...prev, loading: false, error: errorMsg }));
        throw error;
      }
    },
    [executor]
  );

  /**
   * Create approval request
   */
  const requestApproval = useCallback(
    (input: {
      type: "transaction" | "swap" | "yield" | "dca";
      description: string;
      estimatedFee: number;
      riskLevel: "low" | "medium" | "high";
      metadata?: Record<string, any>;
    }) => {
      const approval = executor.createApprovalRequest(input);
      setPendingApprovals(executor.getPendingApprovals());
      return approval;
    },
    [executor]
  );

  /**
   * Sign and send transaction with wallet
   */
  const signAndSend = useCallback(
    async (
      tx: Transaction | VersionedTransaction,
      approvalId?: string
    ): Promise<WalletTransactionResult> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected or cannot sign");
      }

      setState((prev) => ({ ...prev, signing: true, error: null }));

      try {
        const result = await executor.signAndSendTransaction(tx, approvalId);

        if (!result.confirmed) {
          throw new Error(result.error || "Transaction failed");
        }

        setState((prev) => ({
          ...prev,
          signing: false,
          signature: result.signature || null,
          confirmed: result.confirmed
        }));

        // Update pending approvals
        setPendingApprovals(executor.getPendingApprovals());

        return result;
      } catch (error: any) {
        const errorMsg = error.message || "Transaction failed";
        setState((prev) => ({ ...prev, signing: false, error: errorMsg }));
        throw error;
      }
    },
    [wallet.publicKey, wallet.signTransaction, executor]
  );

  /**
   * Sign batch transactions
   */
  const signBatch = useCallback(
    async (txs: (Transaction | VersionedTransaction)[]) => {
      if (!wallet.publicKey || !wallet.signAllTransactions) {
        throw new Error("Wallet cannot sign batch transactions");
      }

      setState((prev) => ({ ...prev, signing: true, error: null }));

      try {
        const signed = await executor.signBatchTransactions(txs);
        setState((prev) => ({ ...prev, signing: false }));
        return signed;
      } catch (error: any) {
        const errorMsg = error.message || "Batch signing failed";
        setState((prev) => ({ ...prev, signing: false, error: errorMsg }));
        throw error;
      }
    },
    [wallet.publicKey, wallet.signAllTransactions, executor]
  );

  /**
   * Get transaction status
   */
  const getStatus = useCallback(
    async (signature: string) => {
      return await executor.getTransactionStatus(signature);
    },
    [executor]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      signing: false,
      error: null,
      signature: null,
      confirmed: false,
      estimatedFee: null
    });
  }, []);

  return {
    // Wallet state
    connected: wallet.connected,
    publicKey: wallet.publicKey,
    wallet: wallet,

    // Transaction state
    ...state,

    // Pending approvals
    pendingApprovals,
    refreshApprovals: () => setPendingApprovals(executor.getPendingApprovals()),

    // Transaction building
    buildSwapTransaction,
    buildStakeTransaction,
    simulateTransaction,

    // Approval & execution
    requestApproval,
    signAndSend,
    signBatch,
    getStatus,

    // Utilities
    reset,
    clearCache: () => executor.clearCache()
  };
}

export type { UseWalletTransactionOptions, TransactionState };
