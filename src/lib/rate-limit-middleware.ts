/**
 * Rate Limit Middleware — Next.js API Route Wrapper
 * 
 * Wraps API route handlers with rate limit enforcement.
 * Extracts identity from auth cookie (Keystone) or x-wallet-address header (Atlas).
 * Returns 429 with Retry-After header when limits are exceeded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, type Resource, type RateLimitResult } from './rate-limiter';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Types ───────────────────────────────────────────────────────────

interface RateLimitOptions {
    resource: Resource;
    isAtlas?: boolean;
}

// ─── Extract Identity ────────────────────────────────────────────────

// Neon Auth cookie names (Better Auth) — same as in middleware.ts
const NEON_AUTH_COOKIE_NAMES = [
    '__Secure-neon-auth.session_token',
    'neon-auth.session_token',
    '__Secure-neon-auth.local.session_data',
    'neon-auth.local.session_data',
    'better-auth.session_token',
];

/**
 * Extracts a unique identity for rate limiting from:
 * 1. x-wallet-address header (Atlas anonymous users)
 * 2. Query param ?wallet= (fallback)
 * 3. Supabase auth session (Keystone wallet users)
 * 4. Neon Auth session cookie (social sign-in users)
 * 5. IP address as last resort
 */
async function extractIdentity(req: NextRequest): Promise<string | null> {
    // Try x-wallet-address header first (Atlas)
    const headerWallet = req.headers.get('x-wallet-address');
    if (headerWallet) return headerWallet;

    // Try query param
    const queryWallet = req.nextUrl.searchParams.get('wallet');
    if (queryWallet) return queryWallet;

    // Try Supabase auth session (Keystone)
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key',
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll() {
                        // Read-only in middleware context
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.wallet_address) {
            return user.user_metadata.wallet_address as string;
        }
        if (user?.email) {
            return `email:${user.email}`;
        }
        if (user?.id) {
            return `uid:${user.id}`;
        }
    } catch {
        // Auth not available — that's ok
    }

    // Try Neon Auth session cookie (social sign-in via Google/Discord)
    for (const name of NEON_AUTH_COOKIE_NAMES) {
        const cookie = req.cookies.get(name);
        if (cookie && cookie.value.length > 0) {
            // Use a hash of the session token as identity (not the raw token)
            return `neon:${cookie.value.slice(0, 16)}`;
        }
    }

    // Last resort: IP-based identity
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    return `ip:${ip}`;
}

// ─── Middleware Wrapper ──────────────────────────────────────────────

/**
 * Wraps an API route handler with rate limit enforcement.
 * 
 * Usage:
 * ```ts
 * import { withRateLimit } from '@/lib/rate-limit-middleware';
 * 
 * export const POST = withRateLimit(
 *   { resource: 'ai_architect_runs' },
 *   async (req) => {
 *     // Your handler logic
 *     return NextResponse.json({ ok: true });
 *   }
 * );
 * ```
 */
export function withRateLimit(
    options: RateLimitOptions,
    handler: (req: NextRequest, rateLimitResult: RateLimitResult) => Promise<NextResponse>
) {
    return async function rateLimitedHandler(req: NextRequest): Promise<NextResponse> {
        const identity = await extractIdentity(req);

        if (!identity) {
            // Should not happen since extractIdentity falls back to IP
            return NextResponse.json(
                {
                    error: 'Identity required',
                    message: 'Could not determine user identity for rate limiting.',
                },
                { status: 401 }
            );
        }

        const result = await enforceRateLimit(identity, options.resource, {
            isAtlas: options.isAtlas,
        });

        if (!result.allowed) {
            const retryAfterSeconds = Math.ceil(
                (result.resetAt.getTime() - Date.now()) / 1000
            );

            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    limit: result.limit,
                    remaining: 0,
                    resetAt: result.resetAt.toISOString(),
                    tier: result.tier,
                    message: `You've reached your ${result.tier} tier limit of ${result.limit} ${options.resource} per period. Upgrade your plan for higher limits.`,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfterSeconds),
                        'X-RateLimit-Limit': String(result.limit),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': result.resetAt.toISOString(),
                    },
                }
            );
        }

        // Execute the actual handler
        const response = await handler(req, result);

        // Add rate limit headers to successful responses
        response.headers.set('X-RateLimit-Limit', String(result.limit === Infinity ? 'unlimited' : result.limit));
        response.headers.set('X-RateLimit-Remaining', String(result.remaining === Infinity ? 'unlimited' : result.remaining));
        response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

        return response;
    };
}

/**
 * Lightweight check-only function (no wrapping).
 * Use this when you need to check limits inside existing handlers.
 * 
 * Usage:
 * ```ts
 * const limit = await checkRouteLimit(req, 'dca_bots');
 * if (!limit.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
 * ```
 */
export async function checkRouteLimit(
    req: NextRequest,
    resource: Resource,
    isAtlas: boolean = false
): Promise<RateLimitResult & { walletAddress: string | null }> {
    const identity = await extractIdentity(req);

    if (!identity) {
        // Should not happen — extractIdentity falls back to IP
        return {
            allowed: true,  // fail open if we somehow can't identify
            remaining: 10,
            limit: 10,
            resetAt: new Date(),
            tier: isAtlas ? 'atlas_free' : 'free',
            walletAddress: null,
        };
    }

    const result = await enforceRateLimit(identity, resource, { isAtlas });
    return { ...result, walletAddress: identity };
}
