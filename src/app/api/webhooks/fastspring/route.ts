import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
    deepFindStringValue,
    fastspringBasicAuthHeader,
    reconcileFastSpringTierForUser,
    resolveKeystoneUserIdFromSubscriptionId,
    subscriptionIdsFromWebhookEvent,
    verifyFastSpringWebhookSignature,
} from "@/lib/fastspring";

const HANDLED_EVENTS = new Set([
    "subscription.activated",
    "subscription.updated",
    "subscription.canceled",
    "subscription.deactivated",
    "subscription.charge.completed",
    "subscription.charge.failed",
    "subscription.paused",
    "subscription.resumed",
    "subscription.uncanceled",
    "order.completed",
]);

/**
 * POST /api/webhooks/fastspring
 * FastSpring server webhook — reconciles user tier via API (full account scan per affected user).
 */
export async function POST(req: NextRequest) {
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const secret = process.env.FASTSPRING_WEBHOOK_SECRET?.trim();
    if (!secret) {
        return NextResponse.json({ error: "FASTSPRING_WEBHOOK_SECRET not configured" }, { status: 503 });
    }

    try {
        fastspringBasicAuthHeader();
    } catch {
        return NextResponse.json({ error: "FastSpring API not configured" }, { status: 503 });
    }

    const rawBody = await req.text();
    const sig =
        req.headers.get("x-fs-signature") ||
        req.headers.get("X-FS-Signature") ||
        req.headers.get("X-Fs-Signature") ||
        null;

    if (!verifyFastSpringWebhookSignature(rawBody, sig, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: { events?: Array<{ type?: string; data?: unknown }> };
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const events = payload.events || [];
    const userIds = new Set<string>();

    const tagUser = deepFindStringValue(payload, "keystone_user_id");
    if (tagUser && /^[0-9a-f-]{36}$/i.test(tagUser)) {
        userIds.add(tagUser);
    }

    for (const ev of events) {
        const type = ev.type || "";
        if (!HANDLED_EVENTS.has(type)) continue;

        const ids = subscriptionIdsFromWebhookEvent(type, ev.data);
        for (const sid of ids) {
            const uid = await resolveKeystoneUserIdFromSubscriptionId(sid);
            if (uid) userIds.add(uid);
        }
    }

    if (userIds.size === 0) {
        return NextResponse.json({ success: true, ignored: true, message: "No mapped users in payload" });
    }

    const miniPath = process.env.FASTSPRING_PRODUCT_PATH_MINI?.trim();
    const maxPath = process.env.FASTSPRING_PRODUCT_PATH_MAX?.trim();
    const scope = (process.env.FASTSPRING_SUBSCRIPTION_SCOPE?.trim() as "live" | "test" | "all" | undefined) || "live";

    const updates: Array<{ userId: string; tier: string }> = [];

    for (const userId of userIds) {
        const result = await reconcileFastSpringTierForUser(userId, miniPath, maxPath, scope);
        await db.update(users).set({ tier: result.tier }).where(eq(users.id, userId));
        updates.push({ userId, tier: result.tier });
    }

    return NextResponse.json({ success: true, updates });
}
