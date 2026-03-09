/**
 * GET /api/studio/marketplace — List all published Mini-Apps.
 * Public endpoint for marketplace browsing.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { miniApps } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRouteLimit(request, 'marketplace_reads');
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        resetAt: rateLimit.resetAt.toISOString(),
      }, { status: 429 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const apps = await db.select({
      id: miniApps.id,
      name: miniApps.name,
      description: miniApps.description,
      priceUsdc: miniApps.priceUsdc,
      rating: miniApps.rating,
      installs: miniApps.installs,
      creatorWallet: miniApps.creatorWallet,
      category: miniApps.category,
      securityScore: miniApps.securityScore,
      arweaveTxId: miniApps.arweaveTxId,
      screenshotUrl: miniApps.screenshotUrl,
      createdAt: miniApps.createdAt,
    })
      .from(miniApps)
      .where(eq(miniApps.isPublished, true))
      .orderBy(desc(miniApps.createdAt));

    return NextResponse.json(apps);
  } catch (err) {
    console.error("[marketplace/GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch marketplace apps" },
      { status: 500 }
    );
  }
}
