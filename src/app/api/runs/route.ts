import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { runs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { checkDatabaseAvailability } from '@/lib/db-utils';

function generateShortId(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = randomBytes(12);
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function validateJsonSize(obj: any, maxSizeBytes: number): boolean {
  const jsonString = JSON.stringify(obj);
  const sizeBytes = Buffer.byteLength(jsonString, 'utf8');
  return sizeBytes <= maxSizeBytes;
}

export async function GET(request: NextRequest) {
  try {
    // Check if database is available
    const dbError = checkDatabaseAvailability();
    if (dbError) return dbError;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const results = await db.select()
      .from(runs)
      .orderBy(desc(runs.createdAt))
      .limit(limit);

    return NextResponse.json({
      ok: true,
      runs: results.map(run => ({
        id: run.id,
        shortId: run.shortId,
        prompt: run.prompt,
        planResult: run.planResult,
        toolResult: run.toolResult,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        runLabel: run.runLabel,
        meta: run.meta
      }))
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      ok: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    const dbError = checkDatabaseAvailability();
    if (dbError) return dbError;

    const body = await request.json();
    const { prompt, planResult, toolResult, runLabel } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json({ 
        ok: false,
        error: "Prompt is required",
        code: "MISSING_PROMPT" 
      }, { status: 400 });
    }

    if (!planResult) {
      return NextResponse.json({ 
        ok: false,
        error: "Plan result is required",
        code: "MISSING_PLAN_RESULT" 
      }, { status: 400 });
    }

    // Validate field types and lengths
    if (typeof prompt !== 'string') {
      return NextResponse.json({ 
        ok: false,
        error: "Prompt must be a string",
        code: "INVALID_PROMPT_TYPE" 
      }, { status: 400 });
    }

    if (prompt.trim().length === 0) {
      return NextResponse.json({ 
        ok: false,
        error: "Prompt cannot be empty",
        code: "EMPTY_PROMPT" 
      }, { status: 400 });
    }

    if (prompt.length > 10000) {
      return NextResponse.json({ 
        ok: false,
        error: "Prompt must be 10000 characters or less",
        code: "PROMPT_TOO_LONG" 
      }, { status: 400 });
    }

    if (typeof planResult !== 'object' || planResult === null) {
      return NextResponse.json({ 
        ok: false,
        error: "Plan result must be a valid JSON object",
        code: "INVALID_PLAN_RESULT" 
      }, { status: 400 });
    }

    if (toolResult !== undefined && (typeof toolResult !== 'object' || toolResult === null)) {
      return NextResponse.json({ 
        ok: false,
        error: "Tool result must be a valid JSON object",
        code: "INVALID_TOOL_RESULT" 
      }, { status: 400 });
    }

    if (runLabel !== undefined) {
      if (typeof runLabel !== 'string') {
        return NextResponse.json({ 
          ok: false,
          error: "Run label must be a string",
          code: "INVALID_RUN_LABEL_TYPE" 
        }, { status: 400 });
      }
      if (runLabel.length > 128) {
        return NextResponse.json({ 
          ok: false,
          error: "Run label must be 128 characters or less",
          code: "RUN_LABEL_TOO_LONG" 
        }, { status: 400 });
      }
    }

    // Validate payload sizes
    if (!validateJsonSize(planResult, 1.5 * 1024 * 1024)) {
      return NextResponse.json({ 
        ok: false,
        error: "Plan result exceeds 1.5MB limit",
        code: "PLAN_RESULT_TOO_LARGE" 
      }, { status: 413 });
    }

    const totalPayloadSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    if (totalPayloadSize > 2 * 1024 * 1024) {
      return NextResponse.json({ 
        ok: false,
        error: "Total payload exceeds 2MB limit",
        code: "PAYLOAD_TOO_LARGE" 
      }, { status: 413 });
    }

    // Sanitize inputs
    const sanitizedPrompt = prompt.trim();
    const sanitizedRunLabel = runLabel ? runLabel.trim() : null;

    // Generate unique shortId with retry logic
    let shortId: string;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      shortId = generateShortId();
      
      // Check if shortId already exists
      const existing = await db.select()
        .from(runs)
        .where(eq(runs.shortId, shortId))
        .limit(1);

      if (existing.length === 0) {
        break;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        return NextResponse.json({ 
          ok: false,
          error: "Unable to generate unique short ID",
          code: "SHORT_ID_GENERATION_FAILED" 
        }, { status: 500 });
      }
    }

    const now = Date.now();

    const newRun = await db.insert(runs)
      .values({
        shortId: shortId!,
        prompt: sanitizedPrompt,
        planResult: planResult,
        toolResult: toolResult || null,
        createdAt: now,
        updatedAt: now,
        runLabel: sanitizedRunLabel,
        meta: null
      })
      .returning();

    return NextResponse.json({
      ok: true,
      id: newRun[0].id,
      shortId: newRun[0].shortId,
      createdAt: newRun[0].createdAt
    }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      ok: false,
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}