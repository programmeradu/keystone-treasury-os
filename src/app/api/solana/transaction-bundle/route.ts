import { NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

export const dynamic = "force-dynamic";

/**
 * Transaction Bundle Analyzer
 * Analyzes wallet transactions and identifies opportunities for bundling
 * to save on fees using Jito bundles or regular atomic transactions
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!address) {
      return NextResponse.json({ error: "Missing address parameter" }, { status: 400 });
    }

    // Validate address
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(address);
    } catch (e) {
      return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json({
        address,
        bundleableTransactions: [
          {
            id: "mock-tx-1",
            type: "token_transfer",
            description: "Transfer USDC to vault",
            estimatedFee: 0.000005,
            canBundle: true,
          },
          {
            id: "mock-tx-2",
            type: "swap",
            description: "Swap SOL -> USDC",
            estimatedFee: 0.000005,
            canBundle: true,
          },
          {
            id: "mock-tx-3",
            type: "stake",
            description: "Stake SOL to mSOL",
            estimatedFee: 0.000005,
            canBundle: true,
          },
        ],
        totalIndividualFees: 0.000015,
        bundledFee: 0.000005,
        savings: 0.00001,
        savingsPercent: 66.67,
        source: "mock",
      }, { status: 200 });
    }

    // Connect to Solana RPC
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
                   process.env.SOLANA_RPC_URL || 
                   "https://api.mainnet-beta.solana.com";
    
    const connection = new Connection(rpcUrl, "confirmed");

    // Get recent transactions
    const signatures = await connection.getSignaturesForAddress(
      publicKey,
      { limit },
      "confirmed"
    );

    if (signatures.length === 0) {
      return NextResponse.json({
        address,
        bundleableTransactions: [],
        totalIndividualFees: 0,
        bundledFee: 0,
        savings: 0,
        savingsPercent: 0,
        message: "No recent transactions found",
      }, { status: 200 });
    }

    // Analyze recent transactions to identify patterns
    const bundleableTransactions: any[] = [];
    const transactionPatterns = new Map<string, number>();

    // Fetch details for recent transactions
    const recentTxs = signatures.slice(0, 10); // Analyze last 10 transactions
    
    for (const sig of recentTxs) {
      try {
        const txDetails = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!txDetails) continue;

        // Analyze transaction type
        const meta = txDetails.meta;
        const fee = (meta?.fee || 0) / 1e9; // Convert lamports to SOL
        
        // Detect transaction patterns
        const message = txDetails.transaction.message;
        const instructions = 'compiledInstructions' in message 
          ? message.compiledInstructions 
          : [];
        
        let txType = "unknown";
        let description = "Unknown transaction";
        let canBundle = true;

        // Simple heuristic to detect transaction types
        if (instructions.length === 1) {
          txType = "simple_transfer";
          description = "SOL transfer";
        } else if (instructions.length === 2) {
          txType = "token_transfer";
          description = "Token transfer";
        } else if (instructions.length >= 3 && instructions.length <= 5) {
          txType = "swap";
          description = "Token swap";
        } else if (instructions.length > 5) {
          txType = "complex";
          description = "Complex transaction";
          canBundle = false; // Complex txs might not bundle well
        }

        // Count pattern occurrences
        transactionPatterns.set(txType, (transactionPatterns.get(txType) || 0) + 1);

        // If this type occurs frequently, it's a good bundling candidate
        if (canBundle && (transactionPatterns.get(txType) || 0) >= 2) {
          bundleableTransactions.push({
            id: sig.signature.slice(0, 16),
            type: txType,
            description,
            estimatedFee: fee,
            canBundle: true,
            timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
          });
        }
      } catch (e) {
        console.error("Error analyzing transaction:", e);
        continue;
      }
    }

    // If we found bundleable transactions
    if (bundleableTransactions.length >= 2) {
      const totalIndividualFees = bundleableTransactions.reduce(
        (sum, tx) => sum + tx.estimatedFee,
        0
      );

      // Bundled fee is approximately one transaction fee (slightly higher for complexity)
      const bundledFee = 0.000005 * (1 + bundleableTransactions.length * 0.05);
      const savings = totalIndividualFees - bundledFee;
      const savingsPercent = (savings / totalIndividualFees) * 100;

      return NextResponse.json({
        address,
        bundleableTransactions: bundleableTransactions.slice(0, 5), // Return top 5
        totalIndividualFees,
        bundledFee,
        savings,
        savingsPercent,
        source: "rpc_analysis",
        recommendations: [
          `Found ${bundleableTransactions.length} similar transactions that could be bundled`,
          `Potential savings: ${(savings * 100).toFixed(6)} SOL per bundle`,
          bundleableTransactions.length >= 3 
            ? "High savings potential - consider using Jito bundles" 
            : "Moderate savings - standard atomic transactions recommended",
        ],
      }, { status: 200 });
    }

    // If no clear bundling opportunities detected
    return NextResponse.json({
      address,
      bundleableTransactions: [],
      totalIndividualFees: 0,
      bundledFee: 0,
      savings: 0,
      savingsPercent: 0,
      message: "No clear bundling opportunities detected in recent transactions",
      suggestions: [
        "Continue making transactions - patterns will emerge over time",
        "Bundling works best when you have multiple similar operations",
        "Consider batching token transfers, swaps, or staking operations",
      ],
    }, { status: 200 });

  } catch (e: any) {
    console.error("Transaction analysis error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/**
 * POST endpoint to create and submit a bundled transaction
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, transactionIds, signedTransaction } = body;

    if (!address || !transactionIds || !Array.isArray(transactionIds)) {
      return NextResponse.json(
        { error: "Missing required fields: address, transactionIds" },
        { status: 400 }
      );
    }

    // Mock mode
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      return NextResponse.json({
        success: true,
        bundleId: `bundle_${Date.now()}`,
        signature: "mock_signature_" + Math.random().toString(36).slice(2),
        message: "MOCK: Bundle submitted successfully",
      }, { status: 200 });
    }

    // In production, this would:
    // 1. Validate the signed transaction
    // 2. Submit to Jito bundle endpoint or regular RPC
    // 3. Wait for confirmation
    // 4. Return bundle results

    // For now, return instructions for manual bundling
    return NextResponse.json({
      success: false,
      message: "Automated bundling not yet implemented",
      instructions: {
        manual: [
          "1. Copy all transaction instructions",
          "2. Create a single Transaction with all instructions",
          "3. Sign with your wallet",
          "4. Submit to Solana RPC or Jito bundle endpoint",
        ],
        jito: {
          endpoint: "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
          docs: "https://jito-labs.gitbook.io/mev/bundle-submission",
        },
      },
    }, { status: 501 }); // 501 Not Implemented

  } catch (e: any) {
    console.error("Bundle creation error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
