/**
 * Enhanced Transaction Agent with Wallet Integration
 * Coordinates between agents and wallet adapter for actual execution
 */

import type {
  ExecutionContext,
  AgentConfig,
  ProgressCallback,
} from "./types";
import { ExecutionStatus } from "./types";
import { BaseAgent } from "./base-agent";
import { Connection, Transaction, VersionedTransaction, PublicKey } from "@solana/web3.js";
import type { WalletTransactionExecutor } from "@/lib/wallet/transaction-executor";

export class EnhancedTransactionAgent extends BaseAgent {
  name = "EnhancedTransactionAgent";
  private connection: Connection;
  private walletExecutor: WalletTransactionExecutor | null = null;

  constructor(
    rpcEndpoint: string,
    config?: Partial<AgentConfig>,
    progressCallback?: ProgressCallback,
    walletExecutor?: WalletTransactionExecutor
  ) {
    const defaultConfig: AgentConfig = {
      name: "EnhancedTransactionAgent",
      timeout: 60000, // 60 seconds for wallet operations
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
    this.walletExecutor = walletExecutor || null;
  }

  /**
   * Set wallet executor (called from coordinator)
   */
  setWalletExecutor(executor: WalletTransactionExecutor) {
    this.walletExecutor = executor;
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
   * Execute transaction with wallet integration
   */
  async executeAgent(context: ExecutionContext, input: any): Promise<any> {
    const {
      transaction,
      instructions,
      simulateOnly = false,
      requiresApproval = true,
      feeLimitSol = 0.1,
      strategyType = "unknown"
    } = input;

    try {
      // Step 1: Prepare transaction
      this.addStep(context, "prepare_transaction");
      let tx: Transaction | VersionedTransaction;

      if (transaction) {
        tx = transaction;
      } else if (instructions && Array.isArray(instructions)) {
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
      const simulationResult = await this.connection.simulateTransaction(tx as any);

      if (simulationResult.value.err) {
        this.setContextData(context, "simulation_error", simulationResult.value.err);
        throw new Error(
          `Simulation failed: ${JSON.stringify(simulationResult.value.err)}`
        );
      }

      context.simulationResult = simulationResult.value;
      this.setContextData(context, "simulation_result", simulationResult);

      // Step 3: Estimate fees
      const estimatedFee = simulationResult.value.unitsConsumed
        ? (simulationResult.value.unitsConsumed / 1_000_000) * 0.00025
        : 0.005;

      this.setContextData(context, "estimated_fee_sol", estimatedFee);

      if (estimatedFee > feeLimitSol) {
        throw new Error(
          `Estimated fees (${estimatedFee} SOL) exceed limit (${feeLimitSol} SOL)`
        );
      }

      // If simulation only, return here
      if (simulateOnly) {
        this.setContextData(context, "simulation_passed", true);
        return {
          simulated: true,
          estimatedFee,
          ready: true
        };
      }

      // Step 4: Request approval if needed
      if (requiresApproval && this.walletExecutor) {
        this.addStep(context, "request_approval");
        context.approvalRequired = true;
        context.state = ExecutionStatus.APPROVAL_REQUIRED;
        this.updateProgress(context);

        // Create approval request
        const approval = this.walletExecutor.createApprovalRequest({
          type: this.getApprovalType(strategyType),
          description: `${strategyType} - Estimated fee: ◎${estimatedFee.toFixed(6)}`,
          estimatedFee,
          riskLevel: this.calculateRiskLevel(strategyType, estimatedFee),
          metadata: {
            strategyType,
            gasUnits: simulationResult.value.unitsConsumed || 0
          }
        });

        this.setContextData(context, "approval_id", approval.id);
        this.setContextData(context, "transaction_prepared", tx);

        return {
          requiresApproval: true,
          approvalId: approval.id,
          estimatedFee,
          description: approval.description,
          riskLevel: approval.riskLevel
        };
      }

      // Step 5: Sign and send
      this.addStep(context, "sign_and_send");
      context.state = ExecutionStatus.EXECUTING;
      this.updateProgress(context);

      if (!this.walletExecutor) {
        // Fallback: just prepare for client-side signing
        this.setContextData(context, "transaction_prepared", tx);
        this.setContextData(context, "transaction_ready_for_signing", true);

        return {
          ready: true,
          estimatedFee,
          message: "Transaction ready for signing",
          transactionData: this.serializeTransaction(tx)
        };
      }

      // Use wallet executor for full signing
      const result = await this.walletExecutor.signAndSendTransaction(tx);

      if (!result.confirmed) {
        throw new Error(result.error || "Transaction failed");
      }

      // Step 6: Confirm
      this.addStep(context, "confirm_transaction");
      context.transactionSignature = result.signature;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);

      return {
        success: true,
        signature: result.signature,
        confirmed: result.confirmed,
        estimatedFee
      };
    } catch (error: any) {
      context.state = ExecutionStatus.FAILED;
      this.updateProgress(context);
      throw error;
    }
  }

  /**
   * Submit pre-approved transaction
   */
  async submitApprovedTransaction(
    context: ExecutionContext,
    approvalId: string
  ): Promise<any> {
    try {
      if (!this.walletExecutor) {
        throw new Error("Wallet executor not available");
      }

      const tx = this.getContextData(context, "transaction_prepared");
      if (!tx) {
        throw new Error("No prepared transaction found");
      }

      this.addStep(context, "submit_approved_transaction");
      context.state = ExecutionStatus.EXECUTING;
      this.updateProgress(context);

      const result = await this.walletExecutor.signAndSendTransaction(tx, approvalId);

      if (!result.confirmed) {
        throw new Error(result.error || "Transaction failed");
      }

      context.transactionSignature = result.signature;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);

      return {
        success: true,
        signature: result.signature,
        confirmed: result.confirmed
      };
    } catch (error: any) {
      context.state = ExecutionStatus.FAILED;
      this.updateProgress(context);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string): Promise<{
    confirmed: boolean;
    success: boolean;
    error?: string;
  }> {
    if (!this.walletExecutor) {
      throw new Error("Wallet executor not available");
    }

    return await this.walletExecutor.getTransactionStatus(signature);
  }

  /**
   * Determine approval type from strategy
   */
  private getApprovalType(strategyType: string): "transaction" | "swap" | "yield" | "dca" {
    if (strategyType.includes("swap")) return "swap";
    if (strategyType.includes("stake") || strategyType.includes("yield")) return "yield";
    if (strategyType.includes("dca")) return "dca";
    return "transaction";
  }

  /**
   * Calculate risk level
   */
  private calculateRiskLevel(
    strategyType: string,
    estimatedFee: number
  ): "low" | "medium" | "high" {
    // High fee = higher risk
    if (estimatedFee > 0.1) return "high";
    if (estimatedFee > 0.05) return "medium";

    // Complex strategies = higher risk
    if (strategyType.includes("rebalance") || strategyType.includes("optimize")) {
      return "medium";
    }

    return "low";
  }

  /**
   * Serialize transaction for client-side transmission
   */
  private serializeTransaction(tx: Transaction | VersionedTransaction): string {
    try {
      const serialized = tx.serialize();
      return Buffer.from(serialized).toString("base64");
    } catch (error) {
      throw new Error("Failed to serialize transaction");
    }
  }
}

export default EnhancedTransactionAgent;
