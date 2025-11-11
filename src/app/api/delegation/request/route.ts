/**
 * Request Token Delegation
 * POST /api/delegation/request
 * 
 * Allows users to approve token spending for automated DCA execution
 */

import { NextResponse } from 'next/server';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getConnection } from '@/lib/solana-rpc';

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

    // Fetch user's existing token account for this mint
    const connection = getConnection();
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(userWallet, { mint: tokenMintPubkey });
    if (tokenAccounts.value.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No token account found for this mint. Ensure you hold the token (an associated token account must exist).'
      }, { status: 400 });
    }
    const userTokenAccount = tokenAccounts.value[0].pubkey;

    // Get token info to determine decimals
    const mintInfo = await connection.getParsedAccountInfo(tokenMintPubkey);
    const parsedData = mintInfo.value?.data as any;
    if (!parsedData?.parsed?.info || typeof parsedData.parsed.info.decimals !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Invalid token mint: unable to retrieve token decimals'
      }, { status: 400 });
    }
    const decimals = parsedData.parsed.info.decimals;

    // Convert amount to smallest units
    // Validate amount precision and range
    if (amount * Math.pow(10, decimals) > Number.MAX_SAFE_INTEGER) {
      return NextResponse.json({
        success: false,
        error: 'Amount too large for safe calculation'
      }, { status: 400 });
    }
    const amountInSmallestUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));

    // Manually construct SPL Token Approve instruction (discriminator = 4)
    const amountBig = amountInSmallestUnits;
    const data = Buffer.alloc(1 + 8);
    data.writeUInt8(4, 0); // Approve instruction code
    for (let i = 0; i < 8; i++) {
      data[1 + i] = Number((amountBig >> BigInt(8 * i)) & BigInt(0xff));
    }
    const approveInstruction = new TransactionInstruction({
      programId: TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: delegateWallet, isSigner: false, isWritable: false },
        { pubkey: userWallet, isSigner: true, isWritable: false }
      ],
      data
    });

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
  amountInSmallestUnits: amountInSmallestUnits.toString(),
        decimals,
        expiryDays,
        expiryTimestamp
      },
      transaction: {
        instruction: {
          programId: approveInstruction.programId.toBase58(),
          keys: approveInstruction.keys.map((k: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }) => ({
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
