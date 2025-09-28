import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { runs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/db-utils';

export async function GET(request: Request) {
  try {
    // Check if database is available
    const dbError = checkDatabaseAvailability();
    if (dbError) return dbError;

    const { pathname } = new URL(request.url);
    const match = pathname.match(/\/api\/runs\/([^/]+)\/?$/i);
    const short_id = match?.[1] || "";

    // Validate shortId format (12 characters alphanumeric)
    if (!short_id || short_id.length !== 12 || !/^[a-zA-Z0-9]{12}$/.test(short_id)) {
      return NextResponse.json({ 
        ok: false,
        error: "Invalid shortId format. Must be exactly 12 alphanumeric characters",
        code: "INVALID_SHORT_ID" 
      }, { status: 400 });
    }

    // Get run by shortId (no auth required - public sharing)
    const run = await db.select()
      .from(runs)
      .where(eq(runs.shortId, short_id))
      .limit(1);

    if (run.length === 0) {
      return NextResponse.json({ 
        ok: false,
        error: "Run not found" 
      }, { status: 404 });
    }

    const runData = run[0];

    return NextResponse.json({
      ok: true,
      run: {
        id: runData.id,
        shortId: runData.shortId,
        prompt: runData.prompt,
        planResult: runData.planResult,
        toolResult: runData.toolResult,
        createdAt: runData.createdAt,
        updatedAt: runData.updatedAt,
        runLabel: runData.runLabel,
        meta: runData.meta
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      ok: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { short_id } = params;

    // Validate shortId format (12 characters alphanumeric)  
    if (!short_id || short_id.length !== 12 || !/^[a-zA-Z0-9]{12}$/.test(short_id)) {
      return NextResponse.json({ 
        ok: false,
        error: "Invalid shortId format. Must be exactly 12 alphanumeric characters",
        code: "INVALID_SHORT_ID" 
      }, { status: 400 });
    }

    // Check if run exists
    const existingRun = await db.select()
      .from(runs)
      .where(eq(runs.shortId, short_id))
      .limit(1);

    if (existingRun.length === 0) {
      return NextResponse.json({ 
        ok: false,
        error: "Run not found" 
      }, { status: 404 });
    }

    // Delete the run (no auth required for now)
    const deleted = await db.delete(runs)
      .where(eq(runs.shortId, short_id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ 
        ok: false,
        error: "Run not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      ok: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}