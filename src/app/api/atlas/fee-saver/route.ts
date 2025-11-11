import { NextResponse } from 'next/server';
import { analyzeTransactionBundle, executeTransactionBundle, isValidSolanaAddress } from '@/lib/atlas-executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/atlas/fee-saver
 * Analyze and execute transaction bundling for fee savings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, walletAddress, bundle } = body;

    if (action === 'analyze') {
      // Validate wallet address
      if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
        return NextResponse.json(
          { error: 'Invalid Solana wallet address' },
          { status: 400 }
        );
      }

      // Analyze pending transactions for bundling
      const result = await analyzeTransactionBundle(walletAddress);

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to analyze transactions' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result
      });
    }

    if (action === 'execute') {
      // Validate inputs for execution
      if (!bundle || !bundle.transactions || bundle.transactions.length === 0) {
        return NextResponse.json(
          { error: 'Invalid transaction bundle' },
          { status: 400 }
        );
      }

      if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
        return NextResponse.json(
          { error: 'Invalid wallet address' },
          { status: 400 }
        );
      }

      if (!bundle.canBundle) {
        return NextResponse.json(
          { error: 'Transactions cannot be bundled' },
          { status: 400 }
        );
      }

      // Execute transaction bundle
      const result = await executeTransactionBundle(bundle, walletAddress);

      return NextResponse.json({
        success: result.success,
        data: result
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "analyze" or "execute"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Fee Saver API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
