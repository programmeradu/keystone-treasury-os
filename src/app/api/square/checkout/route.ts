import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidBillingEmail } from "@/lib/billing-email";
import { createSquareClient, squareCreateSubscriptionCheckoutUrl, squareEnsureCustomer } from "@/lib/square";

/**
 * POST /api/square/checkout
 * Body: { tier: "mini" | "max" }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = createSquareClient();
    if (!client) {
        return NextResponse.json({ error: "Square is not configured (SQUARE_ACCESS_TOKEN)" }, { status: 503 });
    }

    try {
        const { tier } = await req.json();
        if (tier !== "mini" && tier !== "max") {
            return NextResponse.json({ error: 'tier must be "mini" or "max"' }, { status: 400 });
        }

        let email: string | null = null;
        let displayName: string | null = null;
        if (db) {
            const [row] = await db
                .select({ email: users.email, displayName: users.displayName })
                .from(users)
                .where(eq(users.id, user.id))
                .limit(1);
            email = row?.email ?? null;
            displayName = row?.displayName ?? null;
        }

        const billingEmail = email?.trim() || "";
        if (!isValidBillingEmail(billingEmail)) {
            return NextResponse.json(
                {
                    error:
                        "A valid email is required on your account before checkout. Add it in Settings, then try again.",
                },
                { status: 422 }
            );
        }

        const nameParts = (displayName || "").trim().split(/\s+/);
        const wa = user.walletAddress || "";
        const firstName = nameParts[0] || "Wallet";
        const lastName =
            nameParts.slice(1).join(" ").trim() ||
            (wa.length > 4 ? `${wa.slice(0, 6)}-${wa.slice(-4)}` : wa || "Holder");

        const customerId = await squareEnsureCustomer({
            client,
            userId: user.id,
            email: billingEmail,
            firstName,
            lastName,
        });
        if (!customerId) {
            return NextResponse.json({ error: "Could not create or load Square customer" }, { status: 500 });
        }

        const session = await squareCreateSubscriptionCheckoutUrl({
            client,
            tier,
            buyerEmail: billingEmail,
        });

        if (!session.ok) {
            return NextResponse.json({ error: session.detail || "Failed to create checkout link" }, { status: 500 });
        }

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[Square] Checkout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
