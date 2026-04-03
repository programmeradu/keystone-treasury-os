import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notificationPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';

/**
 * GET /api/notifications/preferences
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    // Return defaults if no preferences saved yet
    return NextResponse.json({
      preferences: prefs || {
        emailEnabled: true,
        teamInvites: true,
        roleChanges: true,
        txApprovals: true,
        systemAlerts: true,
        tierExpiry: true,
      },
    });
  } catch (err) {
    console.error('[Prefs API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 */
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const key of ['emailEnabled', 'teamInvites', 'roleChanges', 'txApprovals', 'systemAlerts', 'tierExpiry']) {
      if (body[key] !== undefined) updates[key] = Boolean(body[key]);
    }

    // Upsert
    const [existing] = await db
      .select({ id: notificationPreferences.id })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    if (existing) {
      await db
        .update(notificationPreferences)
        .set(updates)
        .where(eq(notificationPreferences.userId, user.id));
    } else {
      await db.insert(notificationPreferences).values({
        userId: user.id,
        ...updates,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Prefs API] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
