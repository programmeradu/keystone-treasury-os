import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SIWS_COOKIE = 'keystone-siws-session';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }
  return new TextEncoder().encode(secret);
}

export interface AuthUser {
  id: string;
  walletAddress: string;
  tier: string;
}

/**
 * Extracts the authenticated user from the SIWS JWT session cookie.
 * Returns the user's id, walletAddress, and tier from the DB, or null if unauthenticated.
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
      .select({ 
        id: users.id, 
        walletAddress: users.walletAddress,
        tier: users.tier
      })
      .from(users)
      .where(eq(users.walletAddress, wallet))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

/**
 * Sanitizes a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the URL is a relative path starting with '/' and not '//'.
 */
export function sanitizeRedirect(url: string | null | undefined, fallback: string = '/app'): string {
    if (!url || typeof url !== 'string') return fallback;

    // Only allow relative paths starting with a single slash
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
        return url;
    }

    return fallback;
}
