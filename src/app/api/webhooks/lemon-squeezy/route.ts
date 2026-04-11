import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Handle Lemon Squeezy subscription webhooks
 * Enforces tier upgrades/downgrades on user accounts via MoR.
 */
export async function POST(req: NextRequest) {
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    try {
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
        if (!secret) {
            // Return 503 - service unavailable, not 500 internal error
            return NextResponse.json(
                { error: 'LEMON_SQUEEZY_WEBHOOK_SECRET not configured' },
                { status: 503 }
            );
        }

        const rawBody = await req.text();
        const signature = req.headers.get("x-signature") || "";

        // Verify the webhook payload securely
        const hmac = crypto.createHmac("sha256", secret);
        const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
        const signatureBuffer = Buffer.from(signature, "utf8");

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        
        if (eventName === "subscription_created" || eventName === "subscription_updated") {
            const attributes = payload.data.attributes;
            const customData = payload.meta.custom_data;
            const status = attributes.status;
            const variantId = String(attributes.variant_id);

            // Keystone identifies users via custom_data sent during checkout checkout Link generation
            const userId = customData?.user_id;

            if (!userId) {
                return NextResponse.json({ error: "Missing user linkage in custom_data" }, { status: 400 });
            }

            let tierUpdate = "free";

            // If subscription is active, map variant IDs to Keystone Tiers
            if (status === "active" || status === "past_due") {
                const maxVariant = process.env.LEMON_SQUEEZY_MAX_VARIANT_ID;
                if (variantId === maxVariant) {
                    tierUpdate = "max";
                } else {
                    tierUpdate = "mini";
                }
            } else if (status === "expired" || status === "cancelled" || status === "unpaid") {
                tierUpdate = "free";
            }

            await db!.update(users)
                .set({ tier: tierUpdate })
                .where(eq(users.id, userId));

            return NextResponse.json({ success: true, user: userId, newTier: tierUpdate });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Lemon Squeezy] Webhook processing failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
