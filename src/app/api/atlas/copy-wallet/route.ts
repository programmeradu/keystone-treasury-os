import { NextResponse } from 'next/server';
import { executeCopyWalletAnalysis, executeCopyWalletTransactions, isValidSolanaAddress } from '@/lib/atlas-executor';

export const runtime = 'edge';

/**
 * POST /api/atlas/copy-wallet
 * Analyze target wallet and generate portfolio copy plan
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, targetAddress, userBalance, userWallet, plan } = body;

    if (action === 'analyze') {
      // Validate target address
      if (!targetAddress || !isValidSolanaAddress(targetAddress)) {
        return NextResponse.json(
          { error: 'Invalid Solana wallet address' },
          { status: 400 }
        );
      }

      if (!userBalance || userBalance <= 0) {
        return NextResponse.json(
          { error: 'Invalid user balance' },
          { status: 400 }
        );
      }

      // Execute analysis
      const result = await executeCopyWalletAnalysis(targetAddress, userBalance);

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to analyze wallet. Please check the address and try again' },
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
      if (!plan || !plan.transactions || plan.transactions.length === 0) {
        return NextResponse.json(
          { error: 'Invalid portfolio copy plan' },
          { status: 400 }
        );
      }

      if (!userWallet || !isValidSolanaAddress(userWallet)) {
        return NextResponse.json(
          { error: 'Invalid user wallet address' },
          { status: 400 }
        );
      }

      // Execute portfolio copy transactions
      const result = await executeCopyWalletTransactions(plan, userWallet);

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
    console.error('Copy Wallet API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
