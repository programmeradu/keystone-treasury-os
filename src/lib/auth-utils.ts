import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SIWS_COOKIE = 'keystone-siws-session';

function getJwtSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'keystone_sovereign_os_2026'
  );
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
