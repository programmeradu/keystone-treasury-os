/**
 * GET /api/tier — Returns the user's current tier and all rate limit status.
 * 
 * Query: ?wallet=<address>
 * Used by frontend to display remaining limits, tier badge, upgrade prompts.
 */

import { NextRequest, NextResponse } from "next/server";
import {
    resolveTier,
    getAllLimitsForTier,
    type Tier,
    type Resource,
} from "@/lib/rate-limiter";
import { db } from "@/db";
import { rateLimits, users } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getWindowStart(windowSize: string): Date {
    const now = new Date();
    switch (windowSize) {
        case 'hour':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        case 'day':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'month':
            return new Date(now.getFullYear(), now.getMonth(), 1);
        default:
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
}

export async function GET(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get("wallet");
        const isAtlas = req.nextUrl.searchParams.get("atlas") === "true";

        if (!wallet) {
            return NextResponse.json(
                { error: "wallet query param required" },
                { status: 400 }
            );
        }

        // Resolve the user's tier
        const tier = await resolveTier(wallet, { isAtlas });
        const limits = getAllLimitsForTier(tier);

        // Get current usage for each resource
        const usage: Record<string, { used: number; limit: number; remaining: number }> = {};

        if (db) {
            const today = getWindowStart('day');
            const thisMonth = getWindowStart('month');

            // Fetch all rate limit records for this wallet
            const records = await db
                .select()
                .from(rateLimits)
                .where(
                    and(
                        eq(rateLimits.identifier, wallet),
                        gte(rateLimits.windowStart, thisMonth) // get both daily and monthly
                    )
                );

            for (const [resource, limit] of Object.entries(limits)) {
                const windowStart = ['studio_apps', 'dca_bots', 'marketplace_listings', 'alerts', 'tx_cache_days'].includes(resource) ? thisMonth : today;
                const record = records.find(
                    r => r.resource === resource && r.windowStart >= windowStart
                );
                const used = record?.count ?? 0;
                const effectiveLimit = limit === Infinity ? -1 : (limit ?? 0); // -1 = unlimited
                usage[resource] = {
                    used,
                    limit: effectiveLimit,
                    remaining: effectiveLimit === -1 ? -1 : Math.max(0, effectiveLimit - used),
                };
            }
        } else {
            // No DB — return limits with 0 usage
            for (const [resource, limit] of Object.entries(limits)) {
                const effectiveLimit = limit === Infinity ? -1 : (limit ?? 0);
                usage[resource] = { used: 0, limit: effectiveLimit, remaining: effectiveLimit };
            }
        }

        // Check subscription expiry
        let tierExpiresAt: string | null = null;
        if (db) {
            const userRows = await db
                .select({ tierExpiresAt: users.tierExpiresAt })
                .from(users)
                .where(eq(users.walletAddress, wallet))
                .limit(1);
            if (userRows[0]?.tierExpiresAt) {
                tierExpiresAt = userRows[0].tierExpiresAt.toISOString();
            }
        }

        return NextResponse.json({
            wallet,
            tier,
            tierExpiresAt,
            limits: usage,
            isAtlas,
        });
    } catch (error: any) {
        console.error("[tier API] Error:", error);
        return NextResponse.json(
            { error: "Failed to retrieve tier info" },
            { status: 500 }
        );
    }
}
