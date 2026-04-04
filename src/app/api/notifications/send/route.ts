import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, notificationPreferences, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth-utils';
import { sendNotificationEmail } from '@/lib/email-service';

/**
 * POST /api/notifications/send
 * Internal: Creates a notification record AND emails it if the user has emailEnabled.
 * Body: { userId, type, title, message, severity?, actionUrl?, actionLabel?, relatedEntityType?, relatedEntityId? }
 */
export async function POST(request: NextRequest) {
  // This endpoint can be called server-to-server or by authenticated users
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  try {
    const body = await request.json();
    const targetUserId = body.userId || authUser.id;

    // Insert notification into DB
    const [notif] = await db.insert(notifications).values({
      userId: targetUserId,
      type: body.type || 'system',
      title: body.title,
      message: body.message,
      severity: body.severity || 'info',
      actionUrl: body.actionUrl,
      actionLabel: body.actionLabel,
      relatedEntityType: body.relatedEntityType,
      relatedEntityId: body.relatedEntityId,
      metadata: body.metadata,
    }).returning({ id: notifications.id });

    // Check if user wants email notifications
    const [prefs] = await db
      .select({ emailEnabled: notificationPreferences.emailEnabled })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, targetUserId))
      .limit(1);

    const emailEnabled = prefs?.emailEnabled ?? true; // default to true

    if (emailEnabled) {
      // Look up user email
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (user?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stauniverse.tech';
        sendNotificationEmail({
          to: user.email,
          title: body.title,
          message: body.message,
          actionUrl: body.actionUrl ? `${baseUrl}${body.actionUrl}` : undefined,
          actionLabel: body.actionLabel,
        }).catch((err) => console.error('[Notifications] Email failed:', err));
      }
    }

    return NextResponse.json({ success: true, id: notif.id });
  } catch (err) {
    console.error('[Notifications] Send error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
