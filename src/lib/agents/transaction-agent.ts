import type {
  ExecutionContext,
  AgentConfig,
  ProgressCallback,
  ApprovalRequirement,
  ExecutionStep
} from "./types";
import { ExecutionStatus, ErrorSeverity } from "./types";
import { BaseAgent } from "./base-agent";
import {
  Connection,
  VersionedTransaction,
  Transaction,
  Keypair,
  PublicKey
} from "@solana/web3.js";

/**
 * Transaction Agent - Handles signing and sending transactions
 * Responsibilities:
 * - Transaction simulation (no signing required)
 * - Fee estimation
 * - Wallet signing coordination
 * - Transaction execution
 * - Confirmation tracking
 */
export class TransactionAgent extends BaseAgent {
  name = "TransactionAgent";
  private connection: Connection;

  constructor(
    rpcEndpoint: string,
    config?: Partial<AgentConfig>,
    progressCallback?: ProgressCallback
  ) {
    const defaultConfig: AgentConfig = {
      name: "TransactionAgent",
      timeout: 30000, // 30 seconds
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      },
      ...config
    };

    super(defaultConfig, progressCallback);
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  /**
   * Validate transaction input
   */
  async validate(context: ExecutionContext, input: any): Promise<boolean> {
    if (!input) return false;
    if (!input.transaction && !input.instructions) return false;
    if (!context.userPublicKey) return false;
    return true;
  }

  /**
   * Execute transaction - main agent logic
   */
  async executeAgent(context: ExecutionContext, input: any): Promise<any> {
    const {
      transaction,
      instructions,
      simulateOnly = false,
      requiresApproval = false,
      feeLimitSol = 0.1
    } = input;

    try {
      // Step 1: Prepare transaction
      this.addStep(context, "prepare_transaction");
      let tx: Transaction | VersionedTransaction;

      if (transaction) {
        tx = transaction;
      } else if (instructions && Array.isArray(instructions)) {
        const { Keypair } = await import("@solana/web3.js");
        const latestBlockhash = await this.connection.getLatestBlockhash();
        const tx_tmp = new Transaction();
        tx_tmp.recentBlockhash = latestBlockhash.blockhash;
        tx_tmp.feePayer = context.userPublicKey!;
        instructions.forEach((ix) => tx_tmp.add(ix));
        tx = tx_tmp;
      } else {
        throw new Error("Invalid transaction input");
      }

      // Step 2: Simulate transaction
      this.addStep(context, "simulate_transaction");
      const simulationResult = await this.simulateTransaction(tx, context);
      
      if (simulationResult.value.err) {
        this.setContextData(context, "simulation_error", simulationResult.value.err);
        throw new Error(
          `Simulation failed: ${JSON.stringify(simulationResult.value.err)}`
        );
      }

      context.simulationResult = simulationResult;
      this.setContextData(context, "simulation_result", simulationResult);

      // Step 3: Check fees
      const estimatedFee = simulationResult.value.unitsConsumed
        ? (simulationResult.value.unitsConsumed / 1_000_000) * 0.00025
        : 0.005; // Default 5000 lamports

      this.setContextData(context, "estimated_fee_sol", estimatedFee);

      if (estimatedFee > feeLimitSol) {
        throw new Error(
          `Estimated fees (${estimatedFee} SOL) exceed limit (${feeLimitSol} SOL)`
        );
      }

      // If simulation only, return here
      if (simulateOnly) {
        this.setContextData(context, "simulation_passed", true);
        return { simulated: true, estimatedFee };
      }

      // Step 4: Check if approval required
      if (requiresApproval) {
        context.approvalRequired = true;
        context.state = ExecutionStatus.APPROVAL_REQUIRED;
        this.updateProgress(context);
        return {
          approvalRequired: true,
          estimatedFee,
          message: "Awaiting user approval"
        };
      }

      // Step 5: Sign and send (requires wallet context)
      this.addStep(context, "sign_and_send");
      context.state = ExecutionStatus.EXECUTING;
      this.updateProgress(context);

      // Note: In a real implementation, this would use the connected wallet adapter
      // For now, we just prepare the transaction for signing
      this.setContextData(context, "transaction_prepared", tx);
      this.setContextData(context, "transaction_ready_for_signing", true);

      return {
        ready: true,
        estimatedFee,
        message: "Transaction ready for signing"
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Simulate a transaction without signing
   */
  private async simulateTransaction(
    tx: Transaction | VersionedTransaction,
    context: ExecutionContext
  ): Promise<any> {
    try {
      // Set up for simulation
      if (tx instanceof Transaction) {
        tx.feePayer = context.userPublicKey!;
      }

      // Simulate the transaction
      const result = await this.connection.simulateTransaction(tx as any);
      return result;
    } catch (error: any) {
      if (error?.message?.includes("expired")) {
        throw new Error("Transaction expired. Please try again.");
      }
      throw error;
    }
  }

  /**
   * Check approval requirement based on transaction details
   */
  private async checkApprovalRequired(
    context: ExecutionContext,
    input: any
  ): Promise<ApprovalRequirement> {
    // Heuristics for determining if approval is required
    const amount = input.amount || 0;
    const threshold = 10; // SOL threshold

    if (amount > threshold) {
      return {
        required: true,
        reason: `Large transaction: ${amount} SOL`,
        riskLevel: "high",
        amount
      };
    }

    // Low-risk operations might auto-approve
    return {
      required: false,
      reason: "Low-risk operation",
      riskLevel: "low"
    };
  }

  /**
   * Send signed transaction
   */
  async sendSignedTransaction(
    transactionSignature: Uint8Array,
    context: ExecutionContext
  ): Promise<string> {
    try {
      this.addStep(context, "send_transaction");
      context.state = ExecutionStatus.EXECUTING;
      this.updateProgress(context);

      const tx = this.getContextData(context, "transaction_prepared");
      if (!tx) {
        throw new Error("No prepared transaction found");
      }

      const signature = await this.connection.sendTransaction(tx, [], {
        skipPreflight: false
      });

      context.transactionSignature = signature;
      this.setContextData(context, "transaction_signature", signature);

      // Wait for confirmation
      this.addStep(context, "wait_confirmation");
      context.state = ExecutionStatus.CONFIRMING;
      this.updateProgress(context);

      const confirmationStatus = await this.waitForConfirmation(signature);
      context.confirmationStatus = confirmationStatus;
      context.state = ExecutionStatus.SUCCESS;

      return signature;
    } catch (error: any) {
      context.state = ExecutionStatus.FAILED;
      this.updateProgress(context);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForConfirmation(
    signature: string
  ): Promise<"processed" | "confirmed" | "finalized"> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5s delays

    while (attempts < maxAttempts) {
      const status = await this.connection.getSignatureStatus(signature);

      if (status.value?.confirmationStatus === "finalized") {
        return "finalized";
      }
      if (status.value?.confirmationStatus === "confirmed") {
        return "confirmed";
      }

      attempts++;
      await this.delay(5000); // Wait 5 seconds between checks
    }

    throw new Error("Transaction confirmation timeout");
  }
}
