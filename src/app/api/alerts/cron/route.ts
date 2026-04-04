import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alerts } from '@/db/schema';
import { eq, and, lt, or, isNull } from 'drizzle-orm';
import { sendGasAlertEmail } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  let checked = 0;
  let notified = 0;
  let errors = 0;

  try {
    // Check if database is available
    if (!db) {
      console.error('Database not available - missing DATABASE_URL');
      return NextResponse.json({
        ok: false,
        error: 'Database configuration error',
        checked: 0,
        notified: 0,
        errors: 1
      }, { status: 500 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY — emails disabled');
      return NextResponse.json({
        ok: false,
        error: 'Email service not configured',
        checked: 0,
        notified: 0,
        errors: 1
      }, { status: 500 });
    }

    // Construct absolute URLs for internal API calls
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Fetch current gas estimates
    let gasData;
    try {
      const gasResponse = await fetch(`${baseUrl}/api/gas/estimate?chain=ethereum`);
      if (!gasResponse.ok) {
        throw new Error(`Gas API error: ${gasResponse.status}`);
      }
      gasData = await gasResponse.json();

      if (!gasData.ok || !gasData.speeds?.fast?.maxFeePerGas) {
        throw new Error('Gas API returned invalid data: missing fast estimate');
      }
    } catch (error) {
      console.error('Failed to fetch gas estimates:', error);
      return NextResponse.json({
        ok: false,
        error: 'Failed to fetch gas estimates',
        checked: 0,
        notified: 0,
        errors: 1
      }, { status: 500 });
    }

    // Fetch current ETH price
    let priceData;
    try {
      const priceResponse = await fetch(`${baseUrl}/api/price?ids=ethereum&vs_currencies=usd`);
      if (!priceResponse.ok) {
        throw new Error(`Price API error: ${priceResponse.status}`);
      }
      priceData = await priceResponse.json();

      if (!priceData.ethereum?.usd) {
        throw new Error('Price API returned invalid data: missing ethereum USD price');
      }
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      return NextResponse.json({
        ok: false,
        error: 'Failed to fetch ETH price',
        checked: 0,
        notified: 0,
        errors: 1
      }, { status: 500 });
    }

    const gweiPerGas = gasData.speeds.fast.maxFeePerGas;
    const ethUsd = priceData.ethereum.usd;

    // Query all verified and active alerts
    const activeAlerts = await db!.select()
      .from(alerts)
      .where(
        and(
          eq(alerts.verified, true),
          eq(alerts.active, true)
        )
      );

    checked = activeAlerts.length;

    // Calculate 6 hours in milliseconds for notification throttling
    const sixHoursAgo = new Date(Date.now() - (6 * 60 * 60 * 1000));

    for (const alert of activeAlerts) {
      try {
        // Calculate USD cost for this alert's gas units
        const usdCost = gweiPerGas * 1e-9 * alert.minGasUnits * ethUsd;

        // Check if alert should be triggered
        const shouldNotify = Number(usdCost) < Number(alert.thresholdUsd) &&
          (alert.lastNotifiedAt === null || alert.lastNotifiedAt < sixHoursAgo);

        if (shouldNotify) {
          try {
            await sendGasAlertEmail({
              to: alert.email,
              gasPrice: gweiPerGas,
              ethPrice: ethUsd,
              costUsd: Number(usdCost),
              gasUnits: alert.minGasUnits,
              thresholdUsd: Number(alert.thresholdUsd),
            });

            // Update last_notified_at timestamp
            await db!.update(alerts)
              .set({
                lastNotifiedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(alerts.id, alert.id));

            notified++;
            console.log(`Notification sent to ${alert.email} for alert ${alert.id}`);

          } catch (emailError) {
            console.error(`Failed to send email to ${alert.email}:`, emailError);
            errors++;
          }
        }

      } catch (alertError) {
        console.error(`Error processing alert ${alert.id}:`, alertError);
        errors++;
      }
    }

    return NextResponse.json({
      ok: true,
      checked,
      notified,
      errors,
      gasPrice: gweiPerGas,
      ethPrice: ethUsd
    }, { status: 200 });

  } catch (error) {
    console.error('Gas alert cron job error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Internal server error: ' + error,
      checked,
      notified,
      errors: errors + 1
    }, { status: 500 });
  }
}