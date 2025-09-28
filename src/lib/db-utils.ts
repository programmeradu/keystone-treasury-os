import { NextResponse } from 'next/server';
import { db } from '@/db';

/**
 * Check if database is available and return error response if not
 */
export function checkDatabaseAvailability() {
  if (!db) {
    return NextResponse.json({
      error: "Database service is currently unavailable",
      code: "DATABASE_UNAVAILABLE"
    }, { status: 503 });
  }
  return null;
}