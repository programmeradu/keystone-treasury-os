import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { subscriptionToTier, verifyPaddleWebhookSignature } from "@/lib/paddle";

const SUBSCRIPTION_EVENTS = new Set([
    "subscription.created",
    "subscription.updated",
    "subscription.canceled",
    "subscription.paused",
    "subscription.resumed",
]);

/**
 * POST /api/webhooks/paddle
 * Paddle Billing notification destination — updates user tier from subscription state.
 */
export async function POST(req: NextRequest) {
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "PADDLE_WEBHOOK_SECRET not configured" }, { status: 503 });
    }

    const rawBody = await req.text();
    const sig =
        req.headers.get("paddle-signature") ||
        req.headers.get("Paddle-Signature") ||
        null;

    if (!verifyPaddleWebhookSignature(rawBody, sig, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: {
        event_type?: string;
        data?: {
            status?: string;
            items?: Array<{ price?: { id?: string } }>;
            custom_data?: { user_id?: string };
        };
    };

    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventType = payload.event_type || "";
    if (!SUBSCRIPTION_EVENTS.has(eventType)) {
        return NextResponse.json({ success: true, ignored: eventType });
    }

    const data = payload.data;
    if (!data) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const userId = data.custom_data?.user_id;
    if (!userId) {
        return NextResponse.json({ error: "Missing user_id in custom_data" }, { status: 400 });
    }

    const miniPriceId = process.env.PADDLE_PRICE_ID_MINI;
    const maxPriceId = process.env.PADDLE_PRICE_ID_MAX;
    const tierUpdate = subscriptionToTier(data, miniPriceId, maxPriceId);

    await db.update(users).set({ tier: tierUpdate }).where(eq(users.id, userId));

    return NextResponse.json({ success: true, user: userId, newTier: tierUpdate });
}
