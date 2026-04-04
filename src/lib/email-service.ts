import { Resend } from 'resend';
import { render } from '@react-email/components';
import {
  WelcomeEmail,
  TeamInviteEmail,
  NotificationEmail,
  TierExpiryEmail,
  GasAlertEmail,
} from './emails/templates';

// ─── Singleton Resend client ─────────────────────────────────────────
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email-service] RESEND_API_KEY not set — emails disabled');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'Keystone <noreply@stauniverse.tech>';
}

// ─── Core send function ──────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn(`[email-service] Skipped email to ${to}: no RESEND_API_KEY`);
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const html = await render(react);
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[email-service] Failed to send to ${to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[email-service] Sent "${subject}" to ${to} (id: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email-service] Error sending to ${to}:`, msg);
    return { success: false, error: msg };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HIGH-LEVEL SENDERS
// ═══════════════════════════════════════════════════════════════════════

export async function sendWelcomeEmail(to: string, displayName: string) {
  return sendEmail({
    to,
    subject: 'Welcome to Keystone Treasury OS',
    react: WelcomeEmail({ displayName }),
  });
}

export async function sendTeamInviteEmail({
  to,
  teamName,
  inviterName,
  role,
  inviteToken,
}: {
  to: string;
  teamName: string;
  inviterName: string;
  role: string;
  inviteToken: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stauniverse.tech';
  const acceptUrl = `${baseUrl}/app/team?accept=${inviteToken}`;

  return sendEmail({
    to,
    subject: `${inviterName} invited you to ${teamName} on Keystone`,
    react: TeamInviteEmail({ teamName, inviterName, role, acceptUrl }),
  });
}

export async function sendNotificationEmail({
  to,
  title,
  message,
  actionUrl,
  actionLabel,
}: {
  to: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  return sendEmail({
    to,
    subject: `Keystone: ${title}`,
    react: NotificationEmail({ title, message, actionUrl, actionLabel }),
  });
}

export async function sendTierExpiryEmail(to: string, tier: string, daysLeft: number) {
  return sendEmail({
    to,
    subject: `Your Keystone ${tier} plan expires in ${daysLeft} days`,
    react: TierExpiryEmail({ tier, daysLeft }),
  });
}

export async function sendGasAlertEmail({
  to,
  gasPrice,
  ethPrice,
  costUsd,
  gasUnits,
  thresholdUsd,
}: {
  to: string;
  gasPrice: number;
  ethPrice: number;
  costUsd: number;
  gasUnits: number;
  thresholdUsd: number;
}) {
  return sendEmail({
    to,
    subject: '⛽ Gas Alert: Low prices detected!',
    react: GasAlertEmail({ gasPrice, ethPrice, costUsd, gasUnits, thresholdUsd }),
  });
}
