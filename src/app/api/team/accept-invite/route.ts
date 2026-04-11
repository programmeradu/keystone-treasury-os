import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamInvitations, teamMembers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * POST /api/team/accept-invite
 * Accept a team invitation using the invite token.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const body = await request.json();
    const token = String(body.token || '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    // Find invitation
    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token))
      .limit(1);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.acceptedAt) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Mark invitation as accepted
    await db
      .update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.id, invitation.id));

    // Check if user already has a membership record (created during wallet-based invite)
    const [existingMember] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, invitation.teamId), eq(teamMembers.userId, user.id)))
      .limit(1);

    if (existingMember) {
      // Activate existing pending membership
      await db
        .update(teamMembers)
        .set({ status: 'active', acceptedAt: new Date() })
        .where(eq(teamMembers.id, existingMember.id));
    } else {
      // Create new active membership
      await db.insert(teamMembers).values({
        teamId: invitation.teamId,
        userId: user.id,
        walletAddress: user.walletAddress,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
        acceptedAt: new Date(),
        status: 'active',
      });
    }

    return NextResponse.json({ success: true, teamId: invitation.teamId });
  } catch (err) {
    console.error('[Team API] Accept invite error:', err);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
