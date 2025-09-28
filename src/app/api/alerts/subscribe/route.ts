import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alerts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Resend } from 'resend';
import { checkDatabaseAvailability } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    const dbCheckResponse = checkDatabaseAvailability();
    if (dbCheckResponse) {
      return dbCheckResponse;
    }

    const { email, thresholdUsd, minGasUnits } = await request.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({
        error: "Valid email address is required",
        code: "INVALID_EMAIL"
      }, { status: 400 });
    }

    // Set defaults and validate thresholdUsd
    const finalThresholdUsd = thresholdUsd ?? 12.0;
    if (typeof finalThresholdUsd !== 'number' || finalThresholdUsd < 0.1 || finalThresholdUsd > 1000) {
      return NextResponse.json({
        error: "thresholdUsd must be a number between 0.1 and 1000",
        code: "INVALID_THRESHOLD_USD"
      }, { status: 400 });
    }

    // Set defaults and validate minGasUnits
    const finalMinGasUnits = minGasUnits ?? 100000;
    if (!Number.isInteger(finalMinGasUnits) || finalMinGasUnits < 1000 || finalMinGasUnits > 10000000) {
      return NextResponse.json({
        error: "minGasUnits must be an integer between 1000 and 10000000",
        code: "INVALID_MIN_GAS_UNITS"
      }, { status: 400 });
    }

    const conditionType = 'gas_below_usd_per_100k';
    const now = Date.now();

    // Check for existing unverified alert with same email and conditionType
    const existingAlert = await db.select()
      .from(alerts)
      .where(and(
        eq(alerts.email, email.toLowerCase()),
        eq(alerts.conditionType, conditionType),
        eq(alerts.verified, false)
      ))
      .limit(1);

    let alertRecord;

    if (existingAlert.length > 0) {
      // Update existing unverified alert
      const updatedAlert = await db.update(alerts)
        .set({
          thresholdUsd: finalThresholdUsd,
          minGasUnits: finalMinGasUnits,
          active: true,
          updatedAt: now
        })
        .where(eq(alerts.id, existingAlert[0].id))
        .returning();

      alertRecord = updatedAlert[0];
    } else {
      // Generate random 12-character alphanumeric token
      const generateToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 12; i++) {
          token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
      };

      const verifyToken = generateToken();

      // Create new alert
      const newAlert = await db.insert(alerts)
        .values({
          email: email.toLowerCase(),
          conditionType,
          thresholdUsd: finalThresholdUsd,
          minGasUnits: finalMinGasUnits,
          verified: false,
          verifyToken,
          active: true,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      alertRecord = newAlert[0];
    }

    // Send verification email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrl = process.env.APP_URL;

    if (!resendApiKey || !emailFrom || !appUrl) {
      console.error('Missing required environment variables for email sending');
      return NextResponse.json({
        error: "Email service configuration error",
        code: "EMAIL_CONFIG_ERROR"
      }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    const verificationUrl = `${appUrl}/api/alerts/verify?token=${alertRecord.verifyToken}`;
    
    const emailHtml = `
      <html>
        <body>
          <h2>Verify your gas price alert</h2>
          <p>Thank you for subscribing to gas price alerts!</p>
          <p>Please click the link below to verify your email address and activate your alert:</p>
          <p><a href="${verificationUrl}" target="_blank">Verify Email Address</a></p>
          <p>If the link doesn't work, copy and paste this URL into your browser:</p>
          <p>${verificationUrl}</p>
          <p>Your alert settings:</p>
          <ul>
            <li>Email: ${alertRecord.email}</li>
            <li>Threshold: $${alertRecord.thresholdUsd} USD</li>
            <li>Minimum Gas Units: ${alertRecord.minGasUnits}</li>
          </ul>
          <p>If you didn't request this alert, please ignore this email.</p>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: emailFrom,
      to: alertRecord.email,
      subject: "Verify your gas price alert",
      html: emailHtml
    });

    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}