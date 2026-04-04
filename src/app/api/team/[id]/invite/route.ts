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

    // --- Subscription Tier Enforcement ---
    const [team] = await db.select({ createdBy: teams.createdBy, name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const [ownerUser] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, team.createdBy!)).limit(1);
    const tier = ownerUser?.tier || 'free';

    // Count both members and pending invitations that are not expired to prevent abuse
    const existingMembers = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    const currentMemberCount = existingMembers.length;

    if (tier === 'free' && currentMemberCount >= 3) {
      return NextResponse.json({ error: 'Free tier limits Vaults to 3 Team Operatives. Upgrade required.' }, { status: 403 });
    }
    if (tier === 'mini' && currentMemberCount >= 10) {
      return NextResponse.json({ error: 'Mini tier limits Vaults to 10 Team Operatives. Upgrade required.' }, { status: 403 });
    }
    // -------------------------------------

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
      // Look up inviter display name (team name is already cached above)
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
