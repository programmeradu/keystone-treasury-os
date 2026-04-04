import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
import { sendWelcomeEmail, sendTeamInviteEmail } from '@/lib/email-service';

/**
 * POST /api/onboarding/complete-emails
 * Fire-and-forget: sends welcome email + team invitation emails after onboarding.
 * Body: { email?, displayName?, teamEmails: string[] }
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const email = body.email as string | undefined;
    const displayName = (body.displayName as string) || 'there';
    const teamEmails = (body.teamEmails || []) as string[];
    const results: string[] = [];

    // 1. Send welcome email
    if (email && email.includes('@')) {
      const r = await sendWelcomeEmail(email, displayName);
      results.push(`welcome: ${r.success ? 'sent' : r.error}`);
    }

    // 2. Send team invite emails
    for (const inviteeEmail of teamEmails) {
      if (!inviteeEmail.includes('@')) continue;
      const r = await sendTeamInviteEmail({
        to: inviteeEmail,
        teamName: `${displayName}'s Team`,
        inviterName: displayName,
        role: 'viewer',
        inviteToken: crypto.randomUUID(),
      });
      results.push(`invite ${inviteeEmail}: ${r.success ? 'sent' : r.error}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error('[Onboarding Emails] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
