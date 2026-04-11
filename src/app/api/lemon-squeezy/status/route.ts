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
        const lsUrl = `https://api.lemonsqueezy.com/v1/subscriptions?filter[store_id]=${storeId}&page[size]=50&sort=-created_at`;
        
        console.log(`[Lemon Squeezy] Status Check Request: ${lsUrl}`);
        
        const res = await fetch(
            lsUrl,
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Accept": "application/vnd.api+json",
                },
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Lemon Squeezy] API Failure (${res.status}):`, errText);
            
            // Gracefully fallback to the user's DB-recorded tier if the API request fails (e.g., 401 Unauthorized)
            // This prevents the frontend from crashing or erroring if the owner rotates keys or has invalid credentials.
            return NextResponse.json({ 
                tier: user.tier || "free",
                status: "verification_failed",
            });
        }

        const data = await res.json();
        const subscriptions = data.data || [];

        // Simple match for diagnostic
        const match = subscriptions.find((sub: any) => 
            sub.attributes?.custom_data?.user_id === user.id
        );

        if (!match) {
            // Keep the user's DB tier so test mode webhooks show correctly in the UI. 
            // In a strict production environment without test mode, we could consider reverting to free,
            // but preserving the DB state prevents Live API keys from hiding Test Mode checkouts.
            return NextResponse.json({ tier: user.tier || "free", status: "no_live_subscription_found" });
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
