import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    createSquareClient,
    reconcileSquareTierForUser,
    squareResolveUserIdFromCustomerId,
    squareWebhookCollectCustomerIds,
    verifySquareWebhookSignature,
} from "@/lib/square";

/**
 * POST /api/webhooks/square
 * Validates HMAC per Square docs, then re-runs subscription reconciliation per affected customer.
 */
export async function POST(req: NextRequest) {
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const rawBody = await req.text();
    const signature =
        req.headers.get("x-square-hmacsha256-signature") ||
        req.headers.get("X-Square-Hmacsha256-Signature") ||
        null;

    const valid = await verifySquareWebhookSignature({ rawBody, signatureHeader: signature });
    if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const client = createSquareClient();
    if (!client) {
        return NextResponse.json({ error: "Square API not configured" }, { status: 503 });
    }

    const customerIds = squareWebhookCollectCustomerIds(payload);
    const userIds = new Set<string>();

    for (const cid of customerIds) {
        const uid = await squareResolveUserIdFromCustomerId(client, cid);
        if (uid) userIds.add(uid);
    }

    if (userIds.size === 0) {
        return NextResponse.json({ success: true, ignored: true, message: "No mapped users in payload" });
    }

    const updates: Array<{ userId: string; tier: string }> = [];

    for (const userId of userIds) {
        const result = await reconcileSquareTierForUser(client, userId);
        await db.update(users).set({ tier: result.tier }).where(eq(users.id, userId));
        updates.push({ userId, tier: result.tier });
    }

    return NextResponse.json({ success: true, updates });
}
