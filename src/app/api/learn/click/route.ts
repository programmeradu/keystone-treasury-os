import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learnClicks } from '@/db/schema';
import { checkDatabaseAvailability } from '@/lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    const dbError = checkDatabaseAvailability();
    if (dbError) return dbError;

    // Parse request body
    const body = await request.json();
    const { text } = body;

    // Extract bearer token (optional for MVP)
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Validate text field
    if (!text) {
      return NextResponse.json({
        error: "Text field is required",
        code: "MISSING_TEXT"
      }, { status: 400 });
    }

    if (typeof text !== 'string') {
      return NextResponse.json({
        error: "Text must be a string",
        code: "INVALID_TEXT_TYPE"
      }, { status: 400 });
    }

    // Sanitize text by trimming whitespace
    const sanitizedText = text.trim();

    // Validate text length
    if (sanitizedText.length === 0) {
      return NextResponse.json({
        error: "Text cannot be empty after trimming",
        code: "EMPTY_TEXT"
      }, { status: 400 });
    }

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

    // Insert into learnClicks table
    const createdAt = Date.now();
    
    const result = await db.insert(learnClicks)
      .values({
        text: sanitizedText,
        createdAt: createdAt
      })
      .returning();

    if (result.length === 0) {
      throw new Error('Failed to insert suggestion click');
    }

    // Return success response
    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (error) {
    console.error('POST suggestion click error:', error);
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        error: "Invalid JSON in request body",
        code: "INVALID_JSON"
      }, { status: 400 });
    }

    // Handle database errors
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}