"use client";

/**
 * Wallet Interaction Layer
 * Handles all wallet signing, transaction submission, and blockchain interactions
 * Bridges between agent system and @solana/wallet-adapter-react
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  VersionedTransaction,
  SystemProgram,
  Keypair
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import type { StrategyType } from "@/lib/agents";

export interface WalletTransactionRequest {
  type: "send" | "sign" | "simulate";
  transaction?: Transaction | VersionedTransaction;
  instructions?: any[];
  message?: Uint8Array;
}

export interface WalletTransactionResult {
  signature?: string;
  confirmed: boolean;
  error?: string;
  estimatedFee?: number;
  blockhash?: string;
}

export interface ApprovalRequest {
  id: string;
  type: "transaction" | "swap" | "yield" | "dca";
  description: string;
  estimatedFee: number;
  riskLevel: "low" | "medium" | "high";
  metadata?: Record<string, any>;
  expiresAt: number;
}

/**
 * Wallet Transaction Executor
 * Manages signing, approval, and transaction submission
 */
export class WalletTransactionExecutor {
  private connection: Connection;
  private wallet: WalletContextState | null = null;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private transactionCache: Map<string, Transaction | VersionedTransaction> = new Map();

  constructor(rpcEndpoint: string = "https://api.mainnet-beta.solana.com") {
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  /**
   * Set the wallet adapter (call from React component)
   */
  setWallet(wallet: WalletContextState) {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    this.wallet = wallet;
  }

  /**
   * Get current wallet
   */
  getWallet(): WalletContextState | null {
    return this.wallet;
  }

  /**
   * Create a transaction for token swap via Jupiter
   */
  async buildSwapTransaction(input: {
    inMint: string;
    outMint: string;
    amount: number;
    slippage?: number;
    userPublicKey: PublicKey;
  }): Promise<Transaction | VersionedTransaction> {
    if (!this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    try {
      // Get swap route from Jupiter
      const quoteResponse = await this.getJupiterQuote({
        inputMint: input.inMint,
        outputMint: input.outMint,
        amount: input.amount,
        slippageBps: (input.slippage || 0.5) * 100
      });

      if (!quoteResponse) {
        throw new Error("Failed to get Jupiter quote");
      }

      // Get swap instructions from Jupiter
      const swapInstructions = await this.getJupiterSwapInstructions({
        quoteResponse,
        userPublicKey: this.wallet.publicKey,
        wrapUnwrapSOL: true
      });

      if (!swapInstructions?.swapInstruction) {
        throw new Error("Failed to get swap instructions from Jupiter");
      }

      // Build transaction
      const latestBlockhash = await this.connection.getLatestBlockhash();
      const tx = new Transaction({
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: this.wallet.publicKey
      });

      // Add setup instructions if needed
      if (swapInstructions.setupInstructions?.length) {
        swapInstructions.setupInstructions.forEach((ix: any) => tx.add(ix));
      }

      // Add main swap instruction
      tx.add(swapInstructions.swapInstruction);

      // Add cleanup instructions if needed
      if (swapInstructions.cleanupInstruction) {
        tx.add(swapInstructions.cleanupInstruction);
      }

      return tx;
    } catch (error) {
      console.error("Failed to build swap transaction:", error);
      throw error;
    }
  }

  /**
   * Create a transaction for staking SOL
   */
  async buildStakeTransaction(input: {
    amount: number;
    stakePool?: string; // Optional: specific stake pool address
    userPublicKey: PublicKey;
  }): Promise<Transaction> {
    if (!this.wallet?.publicKey) {
      throw new Error("Wallet not connected");
    }

    try {
      const latestBlockhash = await this.connection.getLatestBlockhash();
      const tx = new Transaction({
        recentBlockhash: latestBlockhash.blockhash,
        feePayer: this.wallet.publicKey
      });

      if (input.stakePool) {
        // Use Marinade or other stake pool
        // This would integrate with the specific stake pool's API
        const stakeInstruction = await this.buildStakePoolInstruction({
          stakePool: input.stakePool,
          amount: input.amount,
          userPublicKey: this.wallet.publicKey
        });
        tx.add(stakeInstruction);
      } else {
        // Direct SOL staking via system program
        const stakeAccount = Keypair.generate();
        tx.add(
          SystemProgram.createAccount({
            fromPubkey: this.wallet.publicKey,
            newAccountPubkey: stakeAccount.publicKey,
            lamports: input.amount * 1_000_000_000,
            space: 200, // Stake account size
            programId: new PublicKey("Stake11111111111111111111111111111111111111")
          })
        );
      }

      return tx;
    } catch (error) {
      console.error("Failed to build stake transaction:", error);
      throw error;
    }
  }

  /**
   * Get Jupiter quote
   */
  private async getJupiterQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps: number;
  }) {
    try {
      const params_str = new URLSearchParams({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount.toString(),
        slippageBps: params.slippageBps.toString(),
        asLegacyTransaction: "false",
        maxAccounts: "64"
      });

      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?${params_str}`,
        { method: "GET" }
      );

      if (!response.ok) {
        throw new Error(`Jupiter quote failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get Jupiter quote:", error);
      throw error;
    }
  }

  /**
   * Get Jupiter swap instructions
   */
  private async getJupiterSwapInstructions(params: {
    quoteResponse: any;
    userPublicKey: PublicKey;
    wrapUnwrapSOL: boolean;
  }) {
    try {
      const response = await fetch("https://quote-api.jup.ag/v6/swap-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: params.quoteResponse,
          userPublicKey: params.userPublicKey.toString(),
          wrapUnwrapSOL: params.wrapUnwrapSOL,
          feeAccount: undefined // Optional: add fee account
        })
      });

      if (!response.ok) {
        throw new Error(`Swap instructions failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get swap instructions:", error);
      throw error;
    }
  }

  /**
   * Build stake pool instruction (Marinade, Socean, etc.)
   */
  private async buildStakePoolInstruction(params: {
    stakePool: string;
    amount: number;
    userPublicKey: PublicKey;
  }): Promise<any> {
    // This would be implemented based on the specific stake pool
    // For now, return placeholder
    throw new Error("Stake pool integration to be implemented");
  }

  /**
   * Simulate transaction
   */
  async simulateTransaction(tx: Transaction | VersionedTransaction): Promise<{
    success: boolean;
    error?: string;
    unitsConsumed?: number;
    returnData?: any;
  }> {
    try {
      const result = await this.connection.simulateTransaction(tx as any);

      if (result.value.err) {
        return {
          success: false,
          error: JSON.stringify(result.value.err)
        };
      }

      return {
        success: true,
        unitsConsumed: result.value.unitsConsumed,
        returnData: result.value.returnData
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateFee(tx: Transaction | VersionedTransaction): Promise<number> {
    try {
      const simulation = await this.simulateTransaction(tx);
      
      if (!simulation.success) {
        return 0.005; // Default 5000 lamports
      }

      if (simulation.unitsConsumed) {
        // Lamports = unitsConsumed / 1_000_000 * microLamports per unit (0.00025)
        return (simulation.unitsConsumed / 1_000_000) * 0.00025;
      }

      return 0.005;
    } catch (error) {
      console.error("Failed to estimate fee:", error);
      return 0.005; // Default fallback
    }
  }

  /**
   * Create approval request
   */
  createApprovalRequest(input: {
    type: "transaction" | "swap" | "yield" | "dca";
    description: string;
    estimatedFee: number;
    riskLevel: "low" | "medium" | "high";
    metadata?: Record<string, any>;
  }): ApprovalRequest {
    const id = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const approval: ApprovalRequest = {
      id,
      type: input.type,
      description: input.description,
      estimatedFee: input.estimatedFee,
      riskLevel: input.riskLevel,
      metadata: input.metadata,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minute expiry
    };

    this.pendingApprovals.set(id, approval);
    return approval;
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    const now = Date.now();
    const active = Array.from(this.pendingApprovals.values()).filter(
      (a) => a.expiresAt > now
    );

    // Clean up expired
    this.pendingApprovals.forEach((v, k) => {
      if (v.expiresAt <= now) {
        this.pendingApprovals.delete(k);
      }
    });

    return active;
  }

  /**
   * Sign and send transaction
   */
  async signAndSendTransaction(
    tx: Transaction | VersionedTransaction,
    approvalId?: string
  ): Promise<WalletTransactionResult> {
    if (!this.wallet?.publicKey || !this.wallet.signTransaction) {
      throw new Error("Wallet not connected or cannot sign");
    }

    try {
      // Check approval if required
      if (approvalId) {
        const approval = this.pendingApprovals.get(approvalId);
        if (!approval) {
          throw new Error("Approval not found or expired");
        }

        const now = Date.now();
        if (approval.expiresAt <= now) {
          throw new Error("Approval expired");
        }
      }

      // Sign transaction
      const signedTx = await this.wallet.signTransaction(tx);

      // Serialize and send
      const serialized = signedTx.serialize();
      const signature = await this.connection.sendRawTransaction(serialized, {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(
        signature,
        "confirmed"
      );

      // Clean up approval
      if (approvalId) {
        this.pendingApprovals.delete(approvalId);
      }

      return {
        signature,
        confirmed: !confirmation.value.err,
        error: confirmation.value.err ? JSON.stringify(confirmation.value.err) : undefined
      };
    } catch (error: any) {
      return {
        confirmed: false,
        error: error.message || "Transaction failed"
      };
    }
  }

  /**
   * Batch sign multiple transactions
   */
  async signBatchTransactions(
    txs: (Transaction | VersionedTransaction)[]
  ): Promise<(Transaction | VersionedTransaction)[]> {
    if (!this.wallet?.publicKey || !this.wallet.signAllTransactions) {
      throw new Error("Wallet cannot sign batch transactions");
    }

    return await this.wallet.signAllTransactions(txs);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    success: boolean;
    error?: string;
  }> {
    try {
      const tx = await this.connection.getTransaction(signature);
      
      if (!tx) {
        return { confirmed: false, success: false, error: "Transaction not found" };
      }

      return {
        confirmed: true,
        success: !tx.meta?.err,
        error: tx.meta?.err ? JSON.stringify(tx.meta.err) : undefined
      };
    } catch (error: any) {
      return {
        confirmed: false,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.transactionCache.clear();
    this.pendingApprovals.clear();
  }
}

// Singleton instance
let executor: WalletTransactionExecutor | null = null;

export function getWalletExecutor(rpcEndpoint?: string): WalletTransactionExecutor {
  if (!executor) {
    executor = new WalletTransactionExecutor(rpcEndpoint);
  }
  return executor;
}

export default WalletTransactionExecutor;
