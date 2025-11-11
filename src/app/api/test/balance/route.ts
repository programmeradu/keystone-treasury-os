/**
 * Test endpoint to verify Solana RPC integration
 * GET /api/test/balance?wallet=<address>
 */

import { NextResponse } from 'next/server';
import { getSolBalance, getTokenBalance, TOKENS, checkRPCHealth } from '@/lib/solana-rpc';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');
  
  if (!wallet) {
    return NextResponse.json(
      { 
        error: 'wallet parameter required',
        usage: '/api/test/balance?wallet=YOUR_WALLET_ADDRESS'
      }, 
      { status: 400 }
    );
  }

  try {
    // Check RPC health first
    const health = await checkRPCHealth();
    if (!health.healthy) {
      return NextResponse.json({
        success: false,
        error: 'RPC endpoint unhealthy',
        rpcError: health.error
      }, { status: 503 });
    }

    // Get balances for common tokens
    const [solBalance, usdcBalance, usdtBalance] = await Promise.all([
      getSolBalance(wallet),
      getTokenBalance(wallet, TOKENS.USDC).catch(() => 0),
      getTokenBalance(wallet, TOKENS.USDT).catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      wallet,
      rpc: {
        healthy: true,
        slot: health.slot,
        version: health.version
      },
      balances: {
        SOL: {
          amount: solBalance,
          mint: TOKENS.SOL,
          symbol: 'SOL'
        },
        USDC: {
          amount: usdcBalance,
          mint: TOKENS.USDC,
          symbol: 'USDC'
        },
        USDT: {
          amount: usdtBalance,
          mint: TOKENS.USDT,
          symbol: 'USDT'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Balance check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check balance',
      wallet
    }, { status: 500 });
  }
}
