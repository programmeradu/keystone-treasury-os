import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, teamMembers, teamActivityLog } from '@/db/schema';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * POST /api/team/create
 * Create a new team, set the caller as Owner.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const vaultAddress = body.vaultAddress ? String(body.vaultAddress).trim() : null;

    // Create team
    const [team] = await db.insert(teams).values({
      name,
      vaultAddress,
      createdBy: user.id,
    }).returning();

    // Add creator as owner with active status
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: user.id,
      walletAddress: user.walletAddress,
      role: 'owner',
      invitedBy: user.id,
      acceptedAt: new Date(),
      status: 'active',
    });

    // Log activity
    await db.insert(teamActivityLog).values({
      teamId: team.id,
      userId: user.id,
      action: 'team_created',
      description: `Team "${name}" created`,
    });

    return NextResponse.json({ success: true, team });
  } catch (err) {
    console.error('[Team API] Create error:', err);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
