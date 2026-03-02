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

// ─── Extract Wallet Address ──────────────────────────────────────────

/**
 * Extracts the wallet address from:
 * 1. Supabase auth session (Keystone users)
 * 2. x-wallet-address header (Atlas anonymous users)
 * 3. Query param ?wallet= (fallback)
 */
async function extractWalletAddress(req: NextRequest): Promise<string | null> {
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
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
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
    } catch {
        // Auth not available — that's ok for Atlas
    }

    return null;
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
        const walletAddress = await extractWalletAddress(req);

        if (!walletAddress) {
            return NextResponse.json(
                {
                    error: 'Wallet address required',
                    message: 'Provide wallet via auth session, x-wallet-address header, or ?wallet= param',
                },
                { status: 401 }
            );
        }

        const result = await enforceRateLimit(walletAddress, options.resource, {
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
    const walletAddress = await extractWalletAddress(req);

    if (!walletAddress) {
        return {
            allowed: false,
            remaining: 0,
            limit: 0,
            resetAt: new Date(),
            tier: isAtlas ? 'atlas_free' : 'free',
            walletAddress: null,
        };
    }

    const result = await enforceRateLimit(walletAddress, resource, { isAtlas });
    return { ...result, walletAddress };
}
