import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamActivityLog, teamMembers, users } from '@/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * GET /api/team/[id]/activity
 * Returns the team activity log with optional filters.
 * Query params: ?action=&from=&to=&limit=&offset=
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
    // Verify caller is a team member
    const [membership] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, authUser.id), eq(teamMembers.status, 'active')))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions
    const conditions = [eq(teamActivityLog.teamId, teamId)];
    if (action) conditions.push(eq(teamActivityLog.action, action));
    if (from) conditions.push(gte(teamActivityLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(teamActivityLog.createdAt, new Date(to)));

    const logs = await db
      .select({
        id: teamActivityLog.id,
        action: teamActivityLog.action,
        description: teamActivityLog.description,
        metadata: teamActivityLog.metadata,
        txSignature: teamActivityLog.txSignature,
        createdAt: teamActivityLog.createdAt,
        userId: teamActivityLog.userId,
        userName: users.displayName,
        userAvatar: users.avatarUrl,
        userWallet: users.walletAddress,
      })
      .from(teamActivityLog)
      .leftJoin(users, eq(teamActivityLog.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(teamActivityLog.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(teamActivityLog)
      .where(and(...conditions));

    return NextResponse.json({ logs, total: count, limit, offset });
  } catch (err) {
    console.error('[Activity API] error:', err);
    return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
  }
}
