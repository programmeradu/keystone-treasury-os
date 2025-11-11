import { NextResponse } from 'next/server';
import { executeTimeMachineAnalysis } from '@/lib/atlas-executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/atlas/time-machine
 * Execute historical "what-if" analysis for strategies
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { strategy, amount, daysAgo } = body;

    // Validate inputs
    if (!strategy || !['stake', 'swap', 'lp'].includes(strategy)) {
      return NextResponse.json(
        { error: 'Invalid strategy. Must be stake, swap, or lp' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be greater than 0' },
        { status: 400 }
      );
    }

    if (!daysAgo || daysAgo < 1 || daysAgo > 365) {
      return NextResponse.json(
        { error: 'Invalid days ago. Must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Execute analysis
    const result = await executeTimeMachineAnalysis(strategy, amount, daysAgo);

    if (!result) {
      return NextResponse.json(
        { error: 'Analysis failed. Please try again' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Time Machine API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
