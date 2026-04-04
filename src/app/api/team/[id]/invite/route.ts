import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamMembers, teamInvitations, teamActivityLog, users, teams } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';
import { hasMinRole, isValidRole } from '@/lib/rbac';
import { sendTeamInviteEmail } from '@/lib/email-service';
import crypto from 'crypto';

/**
 * POST /api/team/[id]/invite
 * Invite a user to a team by wallet address or email.
 * Restricted to Owner/Admin.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id: teamId } = await params;

  try {
    const body = await request.json();
    const address = String(body.address || '').trim();
    const role = body.role || 'viewer';

    if (!address) {
      return NextResponse.json({ error: 'address (wallet or email) is required' }, { status: 400 });
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check caller's role
    const [callerMember] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, authUser.id), eq(teamMembers.status, 'active')))
      .limit(1);

    if (!callerMember || !hasMinRole(callerMember.role, 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Determine if wallet or email
    const isWallet = address.length >= 32 && !address.includes('@');
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const [invitation] = await db.insert(teamInvitations).values({
      teamId,
      invitedBy: authUser.id,
      email: isWallet ? null : address,
      walletAddress: isWallet ? address : null,
      role,
      token: inviteToken,
      expiresAt,
    }).returning();

    // Send invite email if address is an email
    if (!isWallet && address.includes('@')) {
      // Look up team name & inviter display name
      const [team] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
      const [inviter] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, authUser.id)).limit(1);

      sendTeamInviteEmail({
        to: address,
        teamName: team?.name || 'Keystone Team',
        inviterName: inviter?.displayName || authUser.id.slice(0, 8),
        role,
        inviteToken,
      }).catch((err) => console.error('[Team API] Email send failed:', err));
    }

    // If wallet matches existing user, auto-create pending team member
    if (isWallet) {
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, address))
        .limit(1);

      if (existingUser) {
        // Check if already a member
        const [existingMember] = await db
          .select({ id: teamMembers.id })
          .from(teamMembers)
          .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, existingUser.id)))
          .limit(1);

        if (!existingMember) {
          await db.insert(teamMembers).values({
            teamId,
            userId: existingUser.id,
            walletAddress: address,
            role,
            invitedBy: authUser.id,
            status: 'pending',
          });
        }
      }
    }

    // Log activity
    await db.insert(teamActivityLog).values({
      teamId,
      userId: authUser.id,
      action: 'member_invited',
      description: `Invited ${address} as ${role}`,
      metadata: { address, role, isWallet },
    });

    return NextResponse.json({ success: true, invitation: { id: invitation.id, token: inviteToken, expiresAt } });
  } catch (err) {
    console.error('[Team API] Invite error:', err);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}

/**
 * GET /api/team/[id]/invite
 * List pending invitations. Restricted to Owner/Admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id: teamId } = await params;

  try {
    // Check caller's role
    const [callerMember] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, authUser.id), eq(teamMembers.status, 'active')))
      .limit(1);

    if (!callerMember || !hasMinRole(callerMember.role, 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const invitations = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.teamId, teamId));

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error('[Team API] List invitations error:', err);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}
