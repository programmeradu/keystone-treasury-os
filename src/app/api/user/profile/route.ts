import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';

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

/** Extract wallet address from the SIWS JWT cookie. Returns null if invalid/missing. */
async function getWalletFromSession(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SIWS_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: 'keystone-treasury-os',
    });
    return (payload.wallet as string) || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/user/profile
 * Fetch the authenticated user's profile from the DB.
 */
export async function GET(request: NextRequest) {
  const wallet = await getWalletFromSession(request);
  if (!wallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarSeed: users.avatarSeed,
        walletAddress: users.walletAddress,
        role: users.role,
        tier: users.tier,
        tierExpiresAt: users.tierExpiresAt,
        onboardingCompleted: users.onboardingCompleted,
        organizationName: users.organizationName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.walletAddress, wallet))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const seed = user.avatarSeed || user.displayName || wallet.slice(0, 8);

    return NextResponse.json({
      id: user.id,
      displayName: user.displayName || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
      email: user.email,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`,
      avatarSeed: seed,
      walletAddress: user.walletAddress,
      role: user.role,
      tier: user.tier,
      tierExpiresAt: user.tierExpiresAt,
      onboardingCompleted: user.onboardingCompleted,
      organizationName: user.organizationName,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('[Profile API] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PUT /api/user/profile
 * Update the authenticated user's profile.
 * Accepts: { displayName?, avatarSeed?, organizationName?, onboardingCompleted? }
 */
export async function PUT(request: NextRequest) {
  const wallet = await getWalletFromSession(request);
  if (!wallet) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Display name
    if (body.displayName !== undefined) {
      const name = String(body.displayName).trim();
      if (!name) {
        return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 });
      }
      updates.displayName = name;
    }

    // Avatar seed
    if (body.avatarSeed !== undefined) {
      updates.avatarSeed = String(body.avatarSeed);
    }

    // Email
    if (body.email !== undefined) {
      const emailVal = String(body.email).trim();
      updates.email = emailVal || null;
    }

    // Organization name
    if (body.organizationName !== undefined) {
      updates.organizationName = body.organizationName ? String(body.organizationName).trim() : null;
    }

    // Onboarding completed flag
    if (body.onboardingCompleted !== undefined) {
      updates.onboardingCompleted = Boolean(body.onboardingCompleted);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.walletAddress, wallet))
      .returning({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        avatarSeed: users.avatarSeed,
        walletAddress: users.walletAddress,
        role: users.role,
        tier: users.tier,
      });

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const seed = updated.avatarSeed || updated.displayName || wallet.slice(0, 8);

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        displayName: updated.displayName,
        email: updated.email,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`,
        avatarSeed: seed,
        walletAddress: updated.walletAddress,
        role: updated.role,
        tier: updated.tier,
      },
    });
  } catch (err) {
    console.error('[Profile API] PUT error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
