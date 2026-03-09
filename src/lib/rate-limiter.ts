/**
 * Rate Limiter — Dual Product Architecture
 * 
 * Keystone App: Free / Mini / Max tiers (authenticated via SIWS)
 * Solana Atlas: Free (anonymous, wallet-based) — Keystone subscribers get elevated limits
 */

import { db } from "@/db";
import { rateLimits, users } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

// ─── Tier Types ──────────────────────────────────────────────────────

export type KeystoneTier = 'free' | 'mini' | 'max';
export type AtlasTier = 'atlas_free' | 'atlas_mini' | 'atlas_max';
export type Tier = KeystoneTier | AtlasTier;

export type Resource =
    // Keystone resources
    | 'ai_architect_runs'
    | 'studio_apps'
    | 'dca_bots'
    | 'marketplace_listings'
    | 'marketplace_reads'
    | 'developer_registrations'
    | 'alerts'
    | 'tx_cache_days'
    // Atlas resources
    | 'atlas_ai_queries'
    | 'atlas_tx_lookups'
    | 'atlas_session_hours';

export type WindowSize = 'hour' | 'day' | 'month';

// ─── Tier Limits Configuration ───────────────────────────────────────

export const TIER_LIMITS: Record<Tier, Partial<Record<Resource, number>>> = {
    // ─── Keystone App Tiers ─────────────────────────
    free: {
        ai_architect_runs: 10,       // per day
        studio_apps: 3,              // total
        dca_bots: 1,                 // concurrent
        marketplace_listings: 5,     // per month
        marketplace_reads: 100,      // per day
        developer_registrations: 3,  // per month
        alerts: 3,                   // concurrent
        tx_cache_days: 7,            // retention days
    },
    mini: {
        ai_architect_runs: 50,
        studio_apps: 15,
        dca_bots: 5,
        marketplace_listings: 25,
        marketplace_reads: 1000,
        developer_registrations: 10,
        alerts: 15,
        tx_cache_days: 30,
    },
    max: {
        ai_architect_runs: Infinity,
        studio_apps: Infinity,
        dca_bots: 50,
        marketplace_listings: Infinity,
        marketplace_reads: Infinity,
        developer_registrations: Infinity,
        alerts: Infinity,
        tx_cache_days: Infinity,
    },

    // ─── Atlas Tiers (wallet-based) ─────────────────
    atlas_free: {
        atlas_ai_queries: 20,        // per day
        atlas_tx_lookups: 50,        // per day
        atlas_session_hours: 24,     // session retention
    },
    atlas_mini: {
        atlas_ai_queries: 100,
        atlas_tx_lookups: 500,
        atlas_session_hours: 720,    // 30 days
    },
    atlas_max: {
        atlas_ai_queries: Infinity,
        atlas_tx_lookups: Infinity,
        atlas_session_hours: Infinity,
    },
};

// ─── Resource Window Mapping ─────────────────────────────────────────

const RESOURCE_WINDOW: Record<Resource, WindowSize> = {
    ai_architect_runs: 'day',
    studio_apps: 'month',
    dca_bots: 'month',
    marketplace_listings: 'month',
    marketplace_reads: 'day',
    developer_registrations: 'month',
    alerts: 'month',
    tx_cache_days: 'month',
    atlas_ai_queries: 'day',
    atlas_tx_lookups: 'day',
    atlas_session_hours: 'day',
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getWindowStart(windowSize: WindowSize): Date {
    const now = new Date();
    switch (windowSize) {
        case 'hour':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        case 'day':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'month':
            return new Date(now.getFullYear(), now.getMonth(), 1);
    }
}

function getWindowEnd(windowStart: Date, windowSize: WindowSize): Date {
    const end = new Date(windowStart);
    switch (windowSize) {
        case 'hour':
            end.setHours(end.getHours() + 1);
            break;
        case 'day':
            end.setDate(end.getDate() + 1);
            break;
        case 'month':
            end.setMonth(end.getMonth() + 1);
            break;
    }
    return end;
}

// ─── Resolve Tier ────────────────────────────────────────────────────

/**
 * Resolves the effective tier for a given identity.
 * - If userId provided: look up Keystone tier from users table
 * - If only walletAddress: check if wallet has a Keystone account → get tier
 * - atlas=true: return atlas-equivalent tier
 */
export async function resolveTier(
    walletAddress: string,
    opts: { isAtlas?: boolean } = {}
): Promise<Tier> {
    if (!db) return opts.isAtlas ? 'atlas_free' : 'free';

    try {
        // Look up user by wallet address
        const userRows = await db
            .select({ tier: users.tier, tierExpiresAt: users.tierExpiresAt })
            .from(users)
            .where(eq(users.walletAddress, walletAddress))
            .limit(1);

        const user = userRows[0];

        if (!user) {
            // No Keystone account → anonymous
            return opts.isAtlas ? 'atlas_free' : 'free';
        }

        const keystoneTier = user.tier as KeystoneTier;

        // Check if tier has expired
        if (user.tierExpiresAt && user.tierExpiresAt < new Date()) {
            return opts.isAtlas ? 'atlas_free' : 'free';
        }

        // If this is an Atlas request, map Keystone tier → Atlas tier
        if (opts.isAtlas) {
            const mapping: Record<KeystoneTier, AtlasTier> = {
                free: 'atlas_free',
                mini: 'atlas_mini',
                max: 'atlas_max',
            };
            return mapping[keystoneTier];
        }

        return keystoneTier;
    } catch (error) {
        console.error('[rate-limiter] Error resolving tier:', error);
        return opts.isAtlas ? 'atlas_free' : 'free';
    }
}

// ─── Check Rate Limit ────────────────────────────────────────────────

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetAt: Date;
    tier: Tier;
}

/**
 * Checks and increments the rate limit for a given identifier + resource.
 * Returns whether the request is allowed and remaining quota.
 */
export async function checkRateLimit(
    identifier: string,
    identifierType: 'wallet' | 'user',
    resource: Resource,
    tier: Tier
): Promise<RateLimitResult> {
    const limit = TIER_LIMITS[tier]?.[resource] ?? 0;
    const windowSize = RESOURCE_WINDOW[resource];
    const windowStart = getWindowStart(windowSize);
    const resetAt = getWindowEnd(windowStart, windowSize);

    // Unlimited tier
    if (limit === Infinity) {
        return { allowed: true, remaining: Infinity, limit: Infinity, resetAt, tier };
    }

    if (!db) {
        return { allowed: true, remaining: limit, limit, resetAt, tier };
    }

    try {
        // Find existing counter for this window
        const existing = await db
            .select()
            .from(rateLimits)
            .where(
                and(
                    eq(rateLimits.identifier, identifier),
                    eq(rateLimits.resource, resource),
                    gte(rateLimits.windowStart, windowStart)
                )
            )
            .limit(1);

        const current = existing[0];

        if (!current) {
            // First request in this window — create counter
            await db.insert(rateLimits).values({
                identifier,
                identifierType,
                resource,
                windowStart,
                windowSize,
                count: 1,
            });

            return { allowed: true, remaining: limit - 1, limit, resetAt, tier };
        }

        if (current.count >= limit) {
            // Limit exceeded
            return { allowed: false, remaining: 0, limit, resetAt, tier };
        }

        // Increment counter
        await db
            .update(rateLimits)
            .set({
                count: current.count + 1,
                lastRequestAt: new Date(),
            })
            .where(eq(rateLimits.id, current.id));

        return {
            allowed: true,
            remaining: limit - current.count - 1,
            limit,
            resetAt,
            tier,
        };
    } catch (error) {
        console.error('[rate-limiter] Error checking rate limit:', error);
        // Fail open — allow request on error
        return { allowed: true, remaining: limit, limit, resetAt, tier };
    }
}

// ─── Convenience: Full Check (resolve tier + check limit) ────────────

/**
 * One-call convenience: resolves tier from wallet, then checks the rate limit.
 */
export async function enforceRateLimit(
    walletAddress: string,
    resource: Resource,
    opts: { isAtlas?: boolean } = {}
): Promise<RateLimitResult> {
    const tier = await resolveTier(walletAddress, opts);
    return checkRateLimit(walletAddress, 'wallet', resource, tier);
}

/**
 * Returns the limit for a specific resource + tier (for display in UI).
 */
export function getLimitForTier(tier: Tier, resource: Resource): number {
    return TIER_LIMITS[tier]?.[resource] ?? 0;
}

/**
 * Returns all limits for a tier (for settings/billing page display).
 */
export function getAllLimitsForTier(tier: Tier): Partial<Record<Resource, number>> {
    return TIER_LIMITS[tier] ?? {};
}
