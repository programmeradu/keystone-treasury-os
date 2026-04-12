import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import {
    fastspringBasicAuthHeader,
    fastspringCreateCheckoutSession,
    fastspringEnsureAccount,
    getBuyerIpFromRequest,
} from "@/lib/fastspring";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidBillingEmail } from "@/lib/billing-email";

/**
 * POST /api/fastspring/checkout
 * Creates a FastSpring Sessions v2 checkout and returns webcheckoutUrl.
 *
 * Body: { tier: "mini" | "max" }
 *
 * Requires a real email on the user profile (no synthetic addresses).
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const checkoutPath = process.env.FASTSPRING_CHECKOUT_PATH?.trim();
    const miniPath = process.env.FASTSPRING_PRODUCT_PATH_MINI?.trim();
    const maxPath = process.env.FASTSPRING_PRODUCT_PATH_MAX?.trim();

    try {
        fastspringBasicAuthHeader();
    } catch {
        return NextResponse.json({ error: "FastSpring is not configured" }, { status: 503 });
    }

    if (!checkoutPath) {
        return NextResponse.json(
            { error: "FASTSPRING_CHECKOUT_PATH is not set (store-id/checkout-id from FastSpring)" },
            { status: 503 }
        );
    }

    try {
        const { tier } = await req.json();
        const productPath = tier === "max" ? maxPath : miniPath;

        if (!productPath) {
            return NextResponse.json(
                { error: `No FastSpring product path configured for tier: ${tier}` },
                { status: 400 }
            );
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

        const defaultCountry = process.env.FASTSPRING_DEFAULT_ACCOUNT_COUNTRY?.trim();
        const fsAccountId = await fastspringEnsureAccount({
            userId: user.id,
            email: billingEmail,
            firstName,
            lastName,
            ...(defaultCountry ? { country: defaultCountry } : {}),
        });

        if (!fsAccountId) {
            return NextResponse.json({ error: "Could not create or load FastSpring account" }, { status: 500 });
        }

        const useTestOrders = process.env.FASTSPRING_USE_TEST_ORDERS === "true";
        const buyerIp = getBuyerIpFromRequest(req.headers);

        const session = await fastspringCreateCheckoutSession({
            checkoutPath,
            productPath,
            fastspringAccountId: fsAccountId,
            userId: user.id,
            buyerIp,
            live: !useTestOrders,
        });

        if (!session.ok) {
            return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
        }

        return NextResponse.json({ url: session.webcheckoutUrl });
    } catch (error) {
        console.error("[FastSpring] Checkout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
