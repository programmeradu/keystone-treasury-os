/**
 * POST /api/studio/marketplace/purchase — Record a purchase in the database.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchases, miniApps } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    const { appId, buyerWallet, txSignature, amountUsdc, creatorPayout, keystoneFee, licenseMint } = body;

    if (!appId || !buyerWallet || !txSignature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = `purch_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(purchases).values({
      id,
      appId,
      buyerWallet,
      txSignature,
      amountUsdc: String(amountUsdc || 0),
      creatorPayout: String(creatorPayout || 0),
      keystoneFee: String(keystoneFee || 0),
    });

    // Increment installs count
    const app = await db.select().from(miniApps).where(eq(miniApps.id, appId)).limit(1);
    if (app[0]) {
      await db.update(miniApps)
        .set({ installs: (app[0].installs || 0) + 1 })
        .where(eq(miniApps.id, appId));
    }

    return NextResponse.json({
      purchaseId: id,
      licenseMint: licenseMint || null,
    });
  } catch (err) {
    console.error("[marketplace/purchase] Error:", err);
    return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 });
  }
}
