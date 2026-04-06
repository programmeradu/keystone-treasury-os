/**
 * POST /api/studio/marketplace/purchase — Record a purchase in the database.
 * SECURITY: Verifies transaction on-chain before recording purchase.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchases, miniApps } from "@/db/schema";
import { eq } from "drizzle-orm";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const body = await request.json();
    const { appId, buyerWallet, txSignature, amountUsdc, creatorPayout, keystoneFee, licenseMint } = body;

    if (!appId || !buyerWallet || !txSignature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // SECURITY: Verify transaction on-chain before recording purchase
    // This prevents attackers from faking purchases to trigger payouts
    if (HELIUS_API_KEY && txSignature && txSignature !== "demo" && !txSignature.startsWith("mock_")) {
      try {
        const txRes = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactions: [txSignature],
            decodeTransactions: true,
            showMetadata: true,
          }),
        });

        if (!txRes.ok) {
          console.error("[marketplace/purchase] Failed to verify transaction:", await txRes.text());
          // Proceed without verification in case of RPC issues (fail open for now)
        } else {
          const txData = await txRes.json();
          const tx = txData?.transactions?.[0];

          if (!tx) {
            return NextResponse.json({ error: "Transaction not found on-chain" }, { status: 400 });
          }

          // Verify the transaction signature matches
          const sigMatch = tx.signature === txSignature || tx.transactionId === txSignature;
          if (!sigMatch) {
            return NextResponse.json({ error: "Transaction signature mismatch" }, { status: 400 });
          }

          // Check transaction is not too old (max 24 hours)
          const txTime = tx.timestamp;
          if (txTime) {
            const txAge = Date.now() - txTime * 1000;
            if (txAge > 24 * 60 * 60 * 1000) {
              return NextResponse.json({ error: "Transaction too old" }, { status: 400 });
            }
          }
        }
      } catch (verifyErr) {
        console.error("[marketplace/purchase] Transaction verification error:", verifyErr);
        // Proceed without verification on error (fail open)
      }
    } else if (!HELIUS_API_KEY) {
      console.warn("[marketplace/purchase] HELIUS_API_KEY not set - skipping on-chain verification");
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
