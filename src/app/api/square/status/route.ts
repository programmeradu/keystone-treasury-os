import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { createSquareClient, reconcileSquareTierForUser } from "@/lib/square";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/square/status
 * Reconciles tier from Square Subscriptions API (webhook safety net).
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = createSquareClient();
    if (!client) {
        return NextResponse.json({ error: "Square is not configured" }, { status: 503 });
    }

    try {
        const result = await reconcileSquareTierForUser(client, user.id);

        if (result.tier !== user.tier && db) {
            await db.update(users).set({ tier: result.tier }).where(eq(users.id, user.id));
        }

        return NextResponse.json({
            tier: result.tier,
            status: result.status,
            nextChargeDate: result.nextChargeDate,
            reconciled: result.tier !== user.tier,
        });
    } catch (error) {
        console.error("[Square] Status check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
