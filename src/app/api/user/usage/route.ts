import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, runs, teamMembers } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';
import { getTierConfig, usagePercent } from '@/lib/tier-config';

/**
 * GET /api/user/usage
 * Returns the user's current usage metrics and tier limits.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    // Get user's tier
    const [dbUser] = await db
      .select({ tier: users.tier, tierExpiresAt: users.tierExpiresAt })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const tier = dbUser?.tier || 'free';
    const config = getTierConfig(tier);
    const tierExpiresAt = dbUser?.tierExpiresAt;

    // Check expiry — if expired, treat as free
    const isExpired = tierExpiresAt && new Date(tierExpiresAt) < new Date();
    const effectiveTier = isExpired ? 'free' : tier;
    const effectiveConfig = isExpired ? getTierConfig('free') : config;

    // Count today's agent runs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [runsToday] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(runs)
      .where(and(eq(runs.userId, user.id), gte(runs.createdAt, today)));
    const agentRunsToday = runsToday?.count || 0;

    // Count team members (across all teams where user is owner/admin)
    const [memberCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id));
    const currentTeamMembers = memberCount?.count || 0;

    return NextResponse.json({
      tier: effectiveTier,
      tierLabel: effectiveConfig.label,
      tierExpiresAt: isExpired ? null : tierExpiresAt,
      isExpired: !!isExpired,
      usage: {
        agentRuns: {
          current: agentRunsToday,
          limit: effectiveConfig.agentRunsPerDay,
          percent: usagePercent(agentRunsToday, effectiveConfig.agentRunsPerDay),
        },
        teamMembers: {
          current: currentTeamMembers,
          limit: effectiveConfig.teamMembers,
          percent: usagePercent(currentTeamMembers, effectiveConfig.teamMembers),
        },
        apiCallsPerHour: {
          limit: effectiveConfig.apiCallsPerHour,
        },
      },
      limits: effectiveConfig,
      features: effectiveConfig.features,
    });
  } catch (err) {
    console.error('[Usage API] error:', err);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
