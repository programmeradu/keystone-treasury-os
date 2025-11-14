/**
 * Real Transaction Service
 * Handles actual Solana transaction execution with real wallet signing
 * Integrates with Solana RPC and wallet adapter
 */

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  Keypair
} from "@solana/web3.js";
import { ExecutionStatus } from "@/lib/agents";

export interface TransactionRequest {
  instructions: any[];
  feePayer?: PublicKey;
  signers?: Keypair[];
  skipPreflight?: boolean;
}

export interface TransactionResult {
  signature: string;
  status: "confirmed" | "finalized";
  fee: number;
  slot: number;
  blockTime?: number;
}

/**
 * Service for real transaction execution
 */
export class RealTransactionService {
  private connection: Connection;
  private rpcEndpoint: string;

  constructor(rpcEndpoint: string = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com") {
    this.rpcEndpoint = rpcEndpoint;
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  /**
   * Build a transaction from instructions
   */
  async buildTransaction(
    instructions: any[],
    feePayer: PublicKey,
    priorityFee?: number
  ): Promise<VersionedTransaction> {
    try {
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

      // Create versioned transaction for better compatibility
      const messageV0 = await this.createMessageV0(
        instructions,
        feePayer,
        blockhash,
        priorityFee
      );

      const transaction = new VersionedTransaction(messageV0);
      return transaction;
    } catch (error: any) {
      throw new Error(`Failed to build transaction: ${error.message}`);
    }
  }

  /**
   * Create a MessageV0 for versioned transactions
   */
  private async createMessageV0(
    instructions: any[],
    feePayer: PublicKey,
    blockhash: string,
    priorityFee?: number
  ): Promise<any> {
    const { TransactionMessage } = await import("@solana/web3.js");

    // Add priority fee instruction if needed
    const allInstructions = instructions;
    if (priorityFee) {
      const {
        ComputeBudgetProgram
      } = await import("@solana/web3.js");
      allInstructions.unshift(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee
        })
      );
    }

    return new TransactionMessage({
      payerKey: feePayer,
      recentBlockhash: blockhash,
      instructions: allInstructions
    }).compileToV0Message();
  }

  /**
   * Simulate a transaction without sending
   */
  async simulateTransaction(
    transaction: VersionedTransaction | Transaction
  ): Promise<{
    computeUnits: number;
    fee: number;
    error?: any;
  }> {
    try {
      const result = await this.connection.simulateTransaction(transaction as any);

      if (result.value.err) {
        return {
          computeUnits: 0,
          fee: 0,
          error: result.value.err
        };
      }

      const computeUnits = result.value.unitsConsumed || 0;
      // Calculate fee: 5000 lamports base + 1 lamport per compute unit
      const fee = (5000 + computeUnits) / 1_000_000_000;

      return {
        computeUnits,
        fee,
        error: undefined
      };
    } catch (error: any) {
      throw new Error(`Simulation failed: ${error.message}`);
    }
  }

  /**
   * Send a signed transaction to the network
   */
  async sendTransaction(
    transaction: VersionedTransaction | Transaction,
    signerPublicKey?: PublicKey
  ): Promise<string> {
    try {
      // Send and confirm in one go
      const signature = await this.connection.sendTransaction(
        transaction as any,
        {
          skipPreflight: false,
          maxRetries: 3
        }
      );

      return signature;
    } catch (error: any) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(
    signature: string,
    timeout: number = 60000
  ): Promise<TransactionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const signatureStatus = await this.connection.getSignatureStatus(signature);

      if (signatureStatus.value?.confirmationStatus === "finalized") {
        // Get transaction details
        const txInfo = await this.connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0
        });

        return {
          signature,
          status: "finalized",
          fee: (txInfo?.meta?.fee || 5000) / 1_000_000_000,
          slot: signatureStatus.context.slot,
          blockTime: txInfo?.blockTime
        };
      }

      if (signatureStatus.value?.confirmationStatus === "confirmed") {
        const txInfo = await this.connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0
        });

        return {
          signature,
          status: "confirmed",
          fee: (txInfo?.meta?.fee || 5000) / 1_000_000_000,
          slot: signatureStatus.context.slot,
          blockTime: txInfo?.blockTime
        };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error("Transaction confirmation timeout");
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(signature: string): Promise<any> {
    try {
      const txInfo = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

      return {
        signature,
        status: txInfo?.meta?.err ? "failed" : "success",
        fee: (txInfo?.meta?.fee || 0) / 1_000_000_000,
        slot: txInfo?.slot,
        blockTime: txInfo?.blockTime,
        logs: txInfo?.meta?.logMessages,
        error: txInfo?.meta?.err
      };
    } catch (error: any) {
      throw new Error(`Failed to get transaction details: ${error.message}`);
    }
  }

  /**
   * Execute full transaction flow: build -> simulate -> send -> confirm
   */
  async executeFullFlow(
    instructions: any[],
    feePayer: PublicKey,
    signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
    priorityFee?: number
  ): Promise<TransactionResult> {
    try {
      // Build transaction
      const transaction = await this.buildTransaction(
        instructions,
        feePayer,
        priorityFee
      );

      // Simulate
      const simResult = await this.simulateTransaction(transaction);
      if (simResult.error) {
        throw new Error(`Simulation failed: ${JSON.stringify(simResult.error)}`);
      }

      // Sign
      const signedTx = await signTransaction(transaction);

      // Send
      const signature = await this.sendTransaction(signedTx, feePayer);

      // Confirm
      const result = await this.waitForConfirmation(signature);

      return result;
    } catch (error: any) {
      throw new Error(`Transaction execution failed: ${error.message}`);
    }
  }

  /**
   * Get current network configuration
   */
  async getNetworkInfo(): Promise<{
    endpoint: string;
    commitment: string;
    slot: number;
    blockTime?: number;
  }> {
    try {
      const slot = await this.connection.getSlot();
      const blockTime = await this.connection.getBlockTime(slot);

      return {
        endpoint: this.rpcEndpoint,
        commitment: "confirmed",
        slot,
        blockTime
      };
    } catch (error: any) {
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }
}

export default RealTransactionService;
