import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SIWS_COOKIE = 'keystone-siws-session';

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'test' || (typeof window === 'undefined' && process.env.CI)) {
            return new TextEncoder().encode('dummy_secret_for_testing.XYZ');
        }
        throw new Error('JWT_SECRET is not set');
    }
    return new TextEncoder().encode(secret);
}

export interface AuthUser {
  id: string;
  walletAddress: string;
}

/**
 * Extracts the authenticated user from the SIWS JWT session cookie.
 * Returns the user's id and walletAddress from the DB, or null if unauthenticated.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(SIWS_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: 'keystone-treasury-os',
    });
    const wallet = payload.wallet as string;
    if (!wallet || !db) return null;

    const [user] = await db
      .select({ id: users.id, walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.walletAddress, wallet))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}
