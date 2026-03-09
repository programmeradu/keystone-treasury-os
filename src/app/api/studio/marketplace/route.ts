/**
 * GET /api/studio/marketplace — List published Mini-Apps, or fetch a single app by ID.
 * PATCH /api/studio/marketplace — Delist an app (set isPublished=false).
 * Public endpoint for marketplace browsing.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { miniApps } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

const APP_FIELDS = {
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
  isPublished: miniApps.isPublished,
  version: miniApps.version,
  code: miniApps.code,
};

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

    // Single app by ID
    const appId = request.nextUrl.searchParams.get("appId");
    if (appId) {
      const rows = await db.select(APP_FIELDS)
        .from(miniApps)
        .where(eq(miniApps.id, appId))
        .limit(1);
      if (rows.length === 0) {
        return NextResponse.json({ error: "App not found" }, { status: 404 });
      }
      return NextResponse.json(rows[0]);
    }

    // List all published apps
    const apps = await db.select(APP_FIELDS)
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

export async function PATCH(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    const { appId, creatorWallet, isPublished } = body;

    if (!appId || !creatorWallet) {
      return NextResponse.json({ error: "appId and creatorWallet required" }, { status: 400 });
    }

    // Verify ownership
    const rows = await db.select({ creatorWallet: miniApps.creatorWallet })
      .from(miniApps)
      .where(eq(miniApps.id, appId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }
    if (rows[0].creatorWallet !== creatorWallet) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.update(miniApps)
      .set({ isPublished: isPublished ?? false, updatedAt: new Date() })
      .where(eq(miniApps.id, appId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[marketplace/PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}
