/**
 * POST /api/studio/publish — Register Mini-App to marketplace (Hot Path).
 * Receives: name, description, code, creatorWallet, arweaveTxId, codeHash, securityScore.
 * Part of keystone publish pipeline — Diamond Merge architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { miniApps } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      code?: string;
      creatorWallet?: string;
      arweaveTxId?: string;
      codeHash?: string;
      securityScore?: number;
      category?: string;
    };

    const { name, description, code, creatorWallet, arweaveTxId, codeHash, securityScore, category } = body;

    if (!name || !description || !code || !creatorWallet) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, code, creatorWallet" },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const id = `app_${Math.random().toString(36).substring(2, 10)}`;
    const now = Date.now();

    await db.insert(miniApps).values({
      id,
      name,
      description,
      code: JSON.parse(code) as Record<string, unknown>,
      creatorWallet,
      version: "1.0.0",
      creatorShare: 0.8,
      isPublished: true,
      priceUsdc: 0,
      category: category ?? "utility",
      codeHash: codeHash ?? null,
      arweaveTxId: arweaveTxId ?? null,
      securityScore: securityScore ?? null,
      lastScanAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ appId: id });
  } catch (err) {
    console.error("[publish] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
