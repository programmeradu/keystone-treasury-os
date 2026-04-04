import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * GET /api/lemon-squeezy/status
 * Manually verifies a user's subscription status against the Lemon Squeezy API.
 * This is the "Ghost Payment" safety net — if a webhook is dropped, the user
 * can hit this endpoint to reconcile their tier.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Lemon Squeezy not configured" }, { status: 503 });
    }

    try {
        // Query Lemon Squeezy for subscriptions, increasing page size to ensure we find the user's record
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        const res = await fetch(
            `https://api.lemonsqueezy.com/v1/subscriptions?filter[store_id]=${storeId}&page[size]=50&sort=-created_at`,
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Accept": "application/vnd.api+json",
                },
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            console.error("[Lemon Squeezy] API Failure:", errText);
            return NextResponse.json({ error: "Failed to query subscriptions" }, { status: 502 });
        }

        const data = await res.json();
        const subscriptions = data.data || [];

        console.log(`[Lemon Squeezy] Checking ${subscriptions.length} subscriptions for user: ${user.id}`);

        // Find matching subscription for this user via custom_data
        const match = subscriptions.find((sub: any) => {
            const rootCustomData = sub.attributes?.custom_data;
            const itemCustomData = sub.attributes?.first_subscription_item?.custom_data;
            
            // Check both root and nested locations (LS API version variance)
            const isMatch = (rootCustomData?.user_id === user.id) || (itemCustomData?.user_id === user.id);
            if (isMatch) {
                console.log(`[Lemon Squeezy] MATCH FOUND for ${user.id}: sub_id=${sub.id}`);
            }
            return isMatch;
        });

        if (!match) {
            return NextResponse.json({ tier: "free", status: "no_subscription" });
        }

        const status = match.attributes.status; // active, past_due, cancelled, expired, etc.
        const variantId = String(match.attributes.variant_id);
        const maxVariantId = process.env.LEMON_SQUEEZY_MAX_VARIANT_ID;

        let tier = "free";
        if (status === "active" || status === "past_due") {
            tier = variantId === maxVariantId ? "max" : "mini";
        }

        // Auto-reconcile if the DB is out of sync
        if (tier !== user.tier) {
            const { db } = await import("@/db");
            const { users } = await import("@/db/schema");
            const { eq } = await import("drizzle-orm");

            if (db) {
                await db.update(users).set({ tier }).where(eq(users.id, user.id));
            }
        }

        return NextResponse.json({
            tier,
            status: match.attributes.status,
            renewsAt: match.attributes.renews_at,
            endsAt: match.attributes.ends_at,
            reconciled: tier !== user.tier,
        });
    } catch (error) {
        console.error("[Lemon Squeezy] Status check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
