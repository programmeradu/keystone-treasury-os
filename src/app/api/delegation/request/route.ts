/**
 * Request Token Delegation
 * POST /api/delegation/request
 * 
 * Allows users to approve token spending for automated DCA execution
 */

import { NextResponse } from 'next/server';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { getConnection } from '@/lib/solana-rpc';

// Workaround for TypeScript module resolution issue with @solana/spl-token v0.4.x
// Use require to bypass TypeScript's strict module checking
const getAssociatedTokenAddressSync = require('@solana/spl-token').getAssociatedTokenAddressSync;
const createApproveInstruction = require('@solana/spl-token').createApproveInstruction;

export const runtime = 'nodejs';

interface DelegationRequest {
  walletAddress: string;
  tokenMint: string;
  amount: number;           // Amount in token units (not smallest units)
  expiryDays: number;       // 30, 60, 90 days
}

export async function POST(request: Request) {
  try {
    const body: DelegationRequest = await request.json();
    const { walletAddress, tokenMint, amount, expiryDays } = body;

    // Validation
    if (!walletAddress || !tokenMint || !amount || !expiryDays) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: walletAddress, tokenMint, amount, expiryDays'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    if (![30, 60, 90, 180].includes(expiryDays)) {
      return NextResponse.json({
        success: false,
        error: 'expiryDays must be one of: 30, 60, 90, 180'
      }, { status: 400 });
    }

    // Get delegation wallet public key from environment
    const delegationWalletKey = process.env.DELEGATION_WALLET_PUBLIC_KEY;
    if (!delegationWalletKey) {
      return NextResponse.json({
        success: false,
        error: 'Delegation wallet not configured. Please contact support.'
      }, { status: 503 });
    }

    // Convert addresses to PublicKeys
    const userWallet = new PublicKey(walletAddress);
    const tokenMintPubkey = new PublicKey(tokenMint);
    const delegateWallet = new PublicKey(delegationWalletKey);

    // Get user's token account (sync in v0.4.x)
    const userTokenAccount = getAssociatedTokenAddressSync(
      tokenMintPubkey,
      userWallet
    );

    // Get token info to determine decimals
    const connection = getConnection();
    const mintInfo = await connection.getParsedAccountInfo(tokenMintPubkey);
    const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;

    // Convert amount to smallest units
    const amountInSmallestUnits = Math.floor(amount * Math.pow(10, decimals));

    // Create approval instruction (v0.4.x standard instruction)
    const approveInstruction = createApproveInstruction(
      userTokenAccount,        // Token account to delegate from
      delegateWallet,          // Delegate (our server wallet)
      userWallet,              // Owner (user's wallet - will sign)
      BigInt(amountInSmallestUnits), // Amount to approve
      [],                      // Multi-signers (none for user wallets)
      TOKEN_PROGRAM_ID
    );

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

    // Calculate expiry timestamp
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60);

    // Return transaction for user to sign
    return NextResponse.json({
      success: true,
      delegation: {
        userWallet: walletAddress,
        tokenMint,
        tokenAccount: userTokenAccount.toBase58(),
        delegateWallet: delegationWalletKey,
        amount,
        amountInSmallestUnits,
        decimals,
        expiryDays,
        expiryTimestamp
      },
      transaction: {
        instruction: {
          programId: approveInstruction.programId.toBase58(),
          keys: approveInstruction.keys.map((k: any) => ({
            pubkey: k.pubkey.toBase58(),
            isSigner: k.isSigner,
            isWritable: k.isWritable
          })),
          data: Array.from(approveInstruction.data)
        },
        blockhash,
        lastValidBlockHeight
      },
      instructions: [
        '1. Review the delegation details above',
        '2. Sign the transaction with your wallet',
        '3. Send the signed transaction to /api/delegation/confirm',
        '4. Your DCA bot will be able to execute automatically'
      ]
    });
  } catch (error: any) {
    console.error('Delegation request failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create delegation request'
    }, { status: 500 });
  }
}
