import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learnInputs } from '@/db/schema';
import { checkDatabaseAvailability } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    const dbError = checkDatabaseAvailability();
    if (dbError) return dbError;

    // Extract optional bearer token (but don't validate for MVP)
    const authorization = request.headers.get('authorization');
    const bearerToken = authorization?.startsWith('Bearer ') 
      ? authorization.slice(7) 
      : null;

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
      createdAt: Date.now()
    };

    const newUserInput = await db!.insert(learnInputs)
      .values(insertData)
      .returning();

    console.log('User input logged:', {
      id: newUserInput[0].id,
      textLength: sanitizedText.length,
      hasIntent: !!sanitizedIntent,
      hasBearerToken: !!bearerToken
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