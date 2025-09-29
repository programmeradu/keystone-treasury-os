import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alerts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    const dbCheckResponse = checkDatabaseAvailability();
    if (dbCheckResponse) {
      return dbCheckResponse;
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Validate token parameter
    if (!token || typeof token !== 'string') {
      const appUrl = process.env.APP_URL;
      if (!appUrl) {
        return NextResponse.json({ 
          error: "APP_URL environment variable is not configured",
          code: "MISSING_APP_URL" 
        }, { status: 500 });
      }
      return NextResponse.redirect(`${appUrl}/oracle?error=invalid_token`);
    }

    // Check if APP_URL is configured
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      return NextResponse.json({ 
        error: "APP_URL environment variable is not configured",
        code: "MISSING_APP_URL" 
      }, { status: 500 });
    }

    // Look up alert by verify token
    const alert = await db!.select()
      .from(alerts)
      .where(eq(alerts.verifyToken, token))
      .limit(1);

    if (alert.length === 0) {
      return NextResponse.redirect(`${appUrl}/oracle?error=invalid_token`);
    }

    // Update alert: set verified=true, verifyToken=null, updatedAt=now
    const updated = await db!.update(alerts)
      .set({
        verified: true,
        verifyToken: null,
        updatedAt: Date.now()
      })
      .where(eq(alerts.verifyToken, token))
      .returning();

    if (updated.length === 0) {
      return NextResponse.redirect(`${appUrl}/oracle?error=invalid_token`);
    }

    // Success: redirect to oracle page with verified=1
    return NextResponse.redirect(`${appUrl}/oracle?verified=1`);

  } catch (error) {
    console.error('GET error:', error);
    
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      return NextResponse.json({ 
        error: "APP_URL environment variable is not configured",
        code: "MISSING_APP_URL" 
      }, { status: 500 });
    }
    
    return NextResponse.redirect(`${appUrl}/oracle?error=invalid_token`);
  }
}