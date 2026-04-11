import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * GET /api/team/my-teams
 * Returns all teams the authenticated user is a member of.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const myMemberships = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
        status: teamMembers.status,
        teamName: teams.name,
        vaultAddress: teams.vaultAddress,
        teamCreatedAt: teams.createdAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.status, 'active')
        )
      );

    return NextResponse.json({ teams: myMemberships });
  } catch (err) {
    console.error('[Team API] My teams error:', err);
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}
