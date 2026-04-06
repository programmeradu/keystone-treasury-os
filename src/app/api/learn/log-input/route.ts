import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learnInputs, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkDatabaseAvailability } from '@/lib/db-utils';
import { jwtVerify } from 'jose';

const SIWS_COOKIE = 'keystone-siws-session';

async function getAuthUser(request: NextRequest): Promise<{ id: string; wallet: string } | null> {
    const token = request.cookies.get(SIWS_COOKIE)?.value;
    if (!token) return null;

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) return null;

        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
            issuer: 'keystone-treasury-os',
        });
        return { id: payload.sub as string, wallet: payload.wallet as string };
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    const dbError = checkDatabaseAvailability();
    if (dbError) return dbError;

    // SECURITY: Validate authentication - bearer token or JWT cookie
    const authorization = request.headers.get('authorization');
    let userId: string | null = null;

    if (authorization?.startsWith('Bearer ')) {
        // Validate bearer token
        const token = authorization.slice(7);
        try {
            const secret = process.env.JWT_SECRET;
            if (secret) {
                const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
                    issuer: 'keystone-treasury-os',
                });
                userId = payload.sub as string;
            }
        } catch {
            return NextResponse.json(
                { error: 'Invalid or expired bearer token' },
                { status: 401 }
            );
        }
    } else {
        // Try JWT cookie authentication
        const authUser = await getAuthUser(request);
        userId = authUser?.id || null;
    }

    if (!userId) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    // Parse request body
    const body = await request.json();
    const { text, intent } = body;

    // Validate text field
    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        error: "Text field is required and must be a string",
        code: "INVALID_TEXT_FIELD"
      }, { status: 400 });
    }

    // Sanitize text by trimming whitespace
    const sanitizedText = text.trim();

    // Validate text length (8-512 characters)
    if (sanitizedText.length < 8) {
      return NextResponse.json({
        error: "Text must be at least 8 characters long",
        code: "TEXT_TOO_SHORT"
      }, { status: 400 });
    }

    if (sanitizedText.length > 512) {
      return NextResponse.json({
        error: "Text must not exceed 512 characters",
        code: "TEXT_TOO_LONG"
      }, { status: 400 });
    }

    // Validate intent field if provided
    let sanitizedIntent: string | null = null;
    if (intent !== undefined) {
      if (typeof intent !== 'string') {
        return NextResponse.json({
          error: "Intent must be a string",
          code: "INVALID_INTENT_TYPE"
        }, { status: 400 });
      }

      sanitizedIntent = intent.trim();

      if (sanitizedIntent.length > 64) {
        return NextResponse.json({
          error: "Intent must not exceed 64 characters",
          code: "INTENT_TOO_LONG"
        }, { status: 400 });
      }

      // Set to null if empty string after trimming
      if (sanitizedIntent.length === 0) {
        sanitizedIntent = null;
      }
    }

    // Insert into learnInputs table
    const insertData = {
      text: sanitizedText,
      intent: sanitizedIntent,
    };

    const newUserInput = await db!.insert(learnInputs)
      .values(insertData)
      .returning();

    console.log('User input logged:', {
      id: newUserInput[0].id,
      textLength: sanitizedText.length,
      hasIntent: !!sanitizedIntent,
      hasUserId: !!userId
    });

    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        error: "Invalid JSON in request body",
        code: "INVALID_JSON"
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}