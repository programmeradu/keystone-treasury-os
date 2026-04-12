import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { getPaddleApiBase, paddleRequestHeaders, subscriptionToTier } from "@/lib/paddle";

/**
 * GET /api/paddle/status
 * Reconciles subscription tier from Paddle Billing (safety net if webhooks lag).
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.PADDLE_API_KEY) {
        return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
    }

    const miniPriceId = process.env.PADDLE_PRICE_ID_MINI;
    const maxPriceId = process.env.PADDLE_PRICE_ID_MAX;

    try {
        const base = getPaddleApiBase();
        const url = new URL(`${base}/subscriptions`);
        url.searchParams.set("status", "active,trialing,past_due,paused");
        url.searchParams.set("per_page", "200");

        const res = await fetch(url.toString(), {
            headers: {
                ...paddleRequestHeaders(),
            },
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error(`[Paddle] List subscriptions failed (${res.status}):`, errText);
            return NextResponse.json({
                tier: user.tier || "free",
                status: "verification_failed",
            });
        }

        const data = (await res.json()) as {
            data?: Array<{
                status?: string;
                items?: Array<{ price?: { id?: string } }>;
                custom_data?: { user_id?: string };
                next_billed_at?: string | null;
                current_billing_period?: { ends_at?: string | null };
            }>;
        };

        const subscriptions = data.data || [];
        const match = subscriptions.find((sub) => sub.custom_data?.user_id === user.id);

        if (!match) {
            return NextResponse.json({
                tier: user.tier || "free",
                status: "no_subscription_found",
            });
        }

        const tier = subscriptionToTier(match, miniPriceId, maxPriceId);

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
            status: match.status,
            nextBilledAt: match.next_billed_at,
            periodEndsAt: match.current_billing_period?.ends_at ?? null,
            reconciled: tier !== user.tier,
        });
    } catch (error) {
        console.error("[Paddle] Status check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
