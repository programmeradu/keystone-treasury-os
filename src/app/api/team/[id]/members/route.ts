import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamMembers, teamActivityLog, users } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';
import { hasMinRole, isValidRole } from '@/lib/rbac';
import type { TeamRole } from '@/lib/rbac';

/**
 * GET /api/team/[id]/members
 * Returns all members of a team with their profiles.
 * SECURITY: Only team members can access the member list.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id: teamId } = await params;

  // SECURITY: Verify the authenticated user is a member of this team
  const [membership] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, user.id),
      eq(teamMembers.status, 'active')
    ))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden - you are not a member of this team' }, { status: 403 });
  }

  try {
    const members = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        walletAddress: teamMembers.walletAddress,
        role: teamMembers.role,
        status: teamMembers.status,
        acceptedAt: teamMembers.acceptedAt,
        invitedAt: teamMembers.invitedAt,
        displayName: users.displayName,
        avatarUrl: users.avatarSeed,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          ne(teamMembers.status, 'removed')
        )
      );

    return NextResponse.json({ members });
  } catch (err) {
    console.error('[Team API] Members error:', err);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

/**
 * PUT /api/team/[id]/members
 * Change a team member's role. Body: { userId, role }
 * Restricted to Owner/Admin.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id: teamId } = await params;

  try {
    const body = await request.json();
    const { userId, role } = body;
    if (!userId || !role || !isValidRole(role)) {
      return NextResponse.json({ error: 'userId and valid role are required' }, { status: 400 });
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

    // Prevent changing owner's role (unless by another owner)
    const [targetMember] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.role === 'owner' && callerMember.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
    }

    const oldRole = targetMember.role;
    await db
      .update(teamMembers)
      .set({ role })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    // Log
    await db.insert(teamActivityLog).values({
      teamId,
      userId: authUser.id,
      action: 'role_changed',
      description: `Changed role from ${oldRole} to ${role}`,
      metadata: { targetUserId: userId, oldRole, newRole: role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Team API] Role change error:', err);
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
  }
}

/**
 * DELETE /api/team/[id]/members
 * Remove a member. Body: { userId }
 * Restricted to Owner/Admin. Owners cannot be removed.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { id: teamId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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

    // Prevent removing owners
    const [targetMember] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 403 });
    }

    await db
      .update(teamMembers)
      .set({ status: 'removed' })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));

    // Log
    await db.insert(teamActivityLog).values({
      teamId,
      userId: authUser.id,
      action: 'member_removed',
      description: `Removed member from team`,
      metadata: { targetUserId: userId, removedRole: targetMember.role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Team API] Remove member error:', err);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
