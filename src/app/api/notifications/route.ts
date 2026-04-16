import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * GET /api/notifications
 * Returns the user's notifications. Query: ?unread=true&limit=20
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const conditions = [eq(notifications.userId, user.id)];
    if (unreadOnly) conditions.push(eq(notifications.read, false));

    const items = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    // Unread count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, user.id),
        eq(notifications.read, false)
      ));

    return NextResponse.json({ notifications: items, unreadCount: count });
  } catch (err) {
    console.error('[Notifications API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications
 * Mark notifications as read. Body: { ids, action: 'read' | 'read_all' }
 */
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'read_all') {
      await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
      return NextResponse.json({ success: true });
    }

    const ids = body.ids as number[];
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }

    if (action === 'read') {
      await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(inArray(notifications.id, ids), eq(notifications.userId, user.id)));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Notifications API] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
