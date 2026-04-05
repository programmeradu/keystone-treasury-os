import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

// ─── Keystone brand tokens ───────────────────────────────────────────
const brand = {
  bg: '#0a0a0f',
  cardBg: '#111118',
  border: '#1e1e2e',
  accent: '#36e27b',
  accentMuted: 'rgba(54, 226, 123, 0.15)',
  text: '#e4e4e7',
  textMuted: '#71717a',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

// ─── Shared Layout ───────────────────────────────────────────────────
export function KeystoneLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head>
        <style>{`* { box-sizing: border-box; }`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: brand.bg,
          fontFamily: brand.fontFamily,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '40px 20px',
          }}
        >
          {/* Logo */}
          <Section style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Text
              style={{
                fontSize: '14px',
                fontWeight: 900,
                letterSpacing: '0.2em',
                textTransform: 'uppercase' as const,
                color: brand.accent,
                margin: 0,
              }}
            >
              ◆ KEYSTONE
            </Text>
          </Section>

          {/* Main card */}
          <Section
            style={{
              backgroundColor: brand.cardBg,
              border: `1px solid ${brand.border}`,
              borderRadius: '16px',
              padding: '40px 32px',
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Text
              style={{
                fontSize: '11px',
                color: brand.textMuted,
                lineHeight: '1.6',
                margin: 0,
              }}
            >
              Keystone Treasury OS — Sovereign infrastructure for on-chain teams.
              <br />
              <Link href="https://stauniverse.tech" style={{ color: brand.textMuted }}>
                stauniverse.tech
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Shared heading ──────────────────────────────────────────────────
function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      style={{
        fontSize: '22px',
        fontWeight: 900,
        color: '#ffffff',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        margin: '0 0 8px 0',
        textAlign: 'center',
      }}
    >
      {children}
    </Heading>
  );
}

function EmailSubtext({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: '14px',
        color: brand.textMuted,
        lineHeight: '1.6',
        textAlign: 'center',
        margin: '0 0 24px 0',
      }}
    >
      {children}
    </Text>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: 'center', margin: '24px 0' }}>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          backgroundColor: brand.accent,
          color: '#000000',
          fontSize: '12px',
          fontWeight: 900,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          padding: '14px 32px',
          borderRadius: '12px',
          textDecoration: 'none',
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════

// ─── 1. Welcome Email ────────────────────────────────────────────────
export function WelcomeEmail({ displayName }: { displayName: string }) {
  return (
    <KeystoneLayout preview="Welcome to Keystone — your sovereign treasury is ready.">
      <EmailHeading>Welcome, {displayName}</EmailHeading>
      <EmailSubtext>
        Your sovereign treasury operating system is live. You&apos;re now part of a
        new generation of on-chain teams managing assets with full autonomy.
      </EmailSubtext>

      <Section
        style={{
          backgroundColor: brand.accentMuted,
          borderRadius: '12px',
          padding: '20px 24px',
          margin: '0 0 20px 0',
        }}
      >
        <Text style={{ fontSize: '12px', fontWeight: 700, color: brand.accent, margin: '0 0 8px 0', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
          WHAT YOU CAN DO NOW
        </Text>
        <Text style={{ fontSize: '13px', color: brand.text, margin: 0, lineHeight: '1.8' }}>
          → Connect and manage multi-sig vaults{'\n'}
          → Deploy AI agents for treasury ops{'\n'}
          → Invite your team with role-based access{'\n'}
          → Build custom mini-apps in the Studio
        </Text>
      </Section>

      <PrimaryButton href="https://stauniverse.tech/app">
        Open Dashboard →
      </PrimaryButton>
    </KeystoneLayout>
  );
}

// ─── 2. Team Invite Email ────────────────────────────────────────────
export function TeamInviteEmail({
  teamName,
  inviterName,
  role,
  acceptUrl,
}: {
  teamName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}) {
  return (
    <KeystoneLayout preview={`${inviterName} invited you to join ${teamName} on Keystone`}>
      <EmailHeading>You&apos;re Invited</EmailHeading>
      <EmailSubtext>
        <strong style={{ color: '#ffffff' }}>{inviterName}</strong> has invited you to
        join <strong style={{ color: '#ffffff' }}>{teamName}</strong> as
        a <strong style={{ color: brand.accent }}>{role}</strong>.
      </EmailSubtext>

      <Section
        style={{
          backgroundColor: brand.accentMuted,
          borderRadius: '12px',
          padding: '16px 24px',
          margin: '0 0 20px 0',
          textAlign: 'center',
        }}
      >
        <Text style={{ fontSize: '11px', color: brand.textMuted, margin: '0 0 4px 0', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
          TEAM
        </Text>
        <Text style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', margin: 0 }}>
          {teamName}
        </Text>
      </Section>

      <PrimaryButton href={acceptUrl}>
        Accept Invitation →
      </PrimaryButton>

      <Text style={{ fontSize: '11px', color: brand.textMuted, textAlign: 'center', margin: 0 }}>
        This invitation expires in 7 days.
      </Text>
    </KeystoneLayout>
  );
}

// ─── 3. Notification Email ───────────────────────────────────────────
export function NotificationEmail({
  title,
  message,
  actionUrl,
  actionLabel,
}: {
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  return (
    <KeystoneLayout preview={title}>
      <EmailHeading>{title}</EmailHeading>
      <EmailSubtext>{message}</EmailSubtext>

      {actionUrl && (
        <PrimaryButton href={actionUrl}>
          {actionLabel || 'View in Keystone →'}
        </PrimaryButton>
      )}
    </KeystoneLayout>
  );
}

// ─── 4. Tier Expiry Warning ──────────────────────────────────────────
export function TierExpiryEmail({
  tier,
  daysLeft,
}: {
  tier: string;
  daysLeft: number;
}) {
  return (
    <KeystoneLayout preview={`Your Keystone ${tier} plan expires in ${daysLeft} days`}>
      <EmailHeading>Plan Expiring Soon</EmailHeading>
      <EmailSubtext>
        Your <strong style={{ color: brand.accent }}>{tier.toUpperCase()}</strong> plan
        expires in <strong style={{ color: '#ffffff' }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
        Renew to keep access to premium features.
      </EmailSubtext>

      <Section
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '16px 24px',
          margin: '0 0 20px 0',
        }}
      >
        <Text style={{ fontSize: '12px', color: '#fca5a5', margin: 0, lineHeight: '1.6' }}>
          After expiry, your account will revert to the Free tier.
          Existing data will be preserved, but tier-limited features
          (extra agents, team seats, priority support) will be disabled.
        </Text>
      </Section>

      <PrimaryButton href="https://stauniverse.tech/pricing">
        Renew Plan →
      </PrimaryButton>
    </KeystoneLayout>
  );
}

// ─── 5. Dca Execution Email ──────────────────────────────────────────
export function DcaExecutionEmail({
  botName,
  status,
  amountUsd,
  buyTokenSymbol,
  receivedAmount,
  errorMessage,
}: {
  botName: string;
  status: 'success' | 'paused';
  amountUsd: string | number;
  buyTokenSymbol: string;
  receivedAmount?: string | number;
  errorMessage?: string;
}) {
  const isSuccess = status === 'success';
  const previewText = isSuccess
    ? `DCA Execution Successful: Bought ${receivedAmount} ${buyTokenSymbol}`
    : `DCA Bot Paused: ${botName}`;

  return (
    <KeystoneLayout preview={previewText}>
      <EmailHeading>{isSuccess ? 'DCA Execution Successful' : 'DCA Bot Paused'}</EmailHeading>
      <EmailSubtext>
        {isSuccess
          ? `Your DCA bot "${botName}" has successfully executed a trade.`
          : `Your DCA bot "${botName}" has been paused due to an error.`}
      </EmailSubtext>

      <Section
        style={{
          backgroundColor: isSuccess ? brand.accentMuted : 'rgba(239, 68, 68, 0.1)',
          border: isSuccess ? 'none' : '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '20px 24px',
          margin: '0 0 20px 0',
        }}
      >
        {isSuccess ? (
          <table style={{ width: '100%', fontSize: '13px', color: brand.text }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', color: brand.textMuted }}>Bot Name</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>{botName}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: brand.textMuted }}>Amount Invested</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>${Number(amountUsd).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: brand.textMuted }}>Received</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700, color: brand.accent }}>
                  {Number(receivedAmount).toLocaleString()} {buyTokenSymbol}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', fontSize: '13px', color: brand.text }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', color: brand.textMuted }}>Bot Name</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>{botName}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: brand.textMuted }}>Reason</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700, color: '#fca5a5' }}>
                  {errorMessage || 'Unknown error'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </Section>

      <PrimaryButton href="https://stauniverse.tech/app">
        Manage Bots in Keystone →
      </PrimaryButton>
    </KeystoneLayout>
  );
}

// ─── 6. Gas Alert Email (replacing inline HTML) ──────────────────────
export function GasAlertEmail({
  gasPrice,
  ethPrice,
  costUsd,
  gasUnits,
  thresholdUsd,
}: {
  gasPrice: number;
  ethPrice: number;
  costUsd: number;
  gasUnits: number;
  thresholdUsd: number;
}) {
  return (
    <KeystoneLayout preview="⛽ Gas prices are low — great time to transact!">
      <EmailHeading>⛽ Gas Alert</EmailHeading>
      <EmailSubtext>Gas prices have dropped below your threshold.</EmailSubtext>

      <Section
        style={{
          backgroundColor: brand.accentMuted,
          borderRadius: '12px',
          padding: '20px 24px',
          margin: '0 0 20px 0',
        }}
      >
        <table style={{ width: '100%', fontSize: '13px', color: brand.text }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', color: brand.textMuted }}>Gas Price (Fast)</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>{gasPrice.toFixed(2)} gwei</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: brand.textMuted }}>ETH Price</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>${ethPrice.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: brand.textMuted }}>Cost ({gasUnits.toLocaleString()} gas)</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700, color: brand.accent }}>${costUsd.toFixed(4)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: brand.textMuted }}>Your Threshold</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>${thresholdUsd.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <PrimaryButton href="https://stauniverse.tech/app">
        Open Keystone →
      </PrimaryButton>
    </KeystoneLayout>
  );
}
