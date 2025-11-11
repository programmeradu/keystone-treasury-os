/**
 * Check Delegation Status
 * GET /api/delegation/status?wallet=<address>
 * 
 * Returns information about active delegations for a wallet
 */

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dcaBots } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json({
      success: false,
      error: 'wallet parameter required'
    }, { status: 400 });
  }

  try {
    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 503 });
    }

    // Get all active bots for this wallet with delegations
    const now = Math.floor(Date.now() / 1000);
    
    const bots = await db
      .select()
      .from(dcaBots)
      .where(
        and(
          eq(dcaBots.walletAddress, walletAddress),
          eq(dcaBots.status, 'active')
        )
      );

    // Group delegations by token
    const delegationsByToken = new Map<string, {
      tokenMint: string;
      tokenSymbol: string;
      bots: any[];
      totalApproved: number;
      totalRemaining: number;
      earliestExpiry: number | null;
      allExpired: boolean;
    }>();

    for (const bot of bots) {
      const hasDelegation = bot.delegationAmount && bot.delegationExpiry;
      const isExpired = bot.delegationExpiry ? bot.delegationExpiry < now : true;

      if (!hasDelegation) continue;

      const key = bot.paymentTokenMint;
      if (!delegationsByToken.has(key)) {
        delegationsByToken.set(key, {
          tokenMint: bot.paymentTokenMint,
          tokenSymbol: bot.paymentTokenSymbol,
          bots: [],
          totalApproved: 0,
          totalRemaining: 0,
          earliestExpiry: null,
          allExpired: true
        });
      }

      const tokenDelegation = delegationsByToken.get(key)!;
      tokenDelegation.bots.push({
        botId: bot.id,
        botName: bot.name,
        remaining: bot.delegationAmount || 0,
        expiry: bot.delegationExpiry,
        isExpired
      });

      tokenDelegation.totalRemaining += bot.delegationAmount || 0;
      
      if (!isExpired) {
        tokenDelegation.allExpired = false;
      }

      if (bot.delegationExpiry) {
        if (tokenDelegation.earliestExpiry === null || bot.delegationExpiry < tokenDelegation.earliestExpiry) {
          tokenDelegation.earliestExpiry = bot.delegationExpiry;
        }
      }
    }

    // Convert to array
    const delegations = Array.from(delegationsByToken.values()).map(d => ({
      tokenMint: d.tokenMint,
      tokenSymbol: d.tokenSymbol,
      totalRemaining: d.totalRemaining,
      earliestExpiry: d.earliestExpiry,
      expiresIn: d.earliestExpiry ? Math.max(0, d.earliestExpiry - now) : 0,
      expiresInDays: d.earliestExpiry ? Math.max(0, Math.floor((d.earliestExpiry - now) / (24 * 60 * 60))) : 0,
      isExpired: d.allExpired,
      bots: d.bots
    }));

    return NextResponse.json({
      success: true,
      walletAddress,
      delegations,
      activeBots: bots.length,
      botsWithDelegation: bots.filter(b => b.delegationAmount && b.delegationExpiry).length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Failed to get delegation status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get delegation status'
    }, { status: 500 });
  }
}
