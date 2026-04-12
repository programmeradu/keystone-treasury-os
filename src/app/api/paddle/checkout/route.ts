import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { getPaddleApiBase, paddleRequestHeaders } from "@/lib/paddle";

/**
 * POST /api/paddle/checkout
 * Creates a Paddle Billing draft transaction and returns checkout.url (hosted checkout).
 *
 * Body: { tier: "mini" | "max" }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const miniPriceId = process.env.PADDLE_PRICE_ID_MINI;
    const maxPriceId = process.env.PADDLE_PRICE_ID_MAX;

    if (!process.env.PADDLE_API_KEY) {
        return NextResponse.json({ error: "Paddle is not configured" }, { status: 503 });
    }

    try {
        const { tier } = await req.json();
        const priceId = tier === "max" ? maxPriceId : miniPriceId;

        if (!priceId) {
            return NextResponse.json({ error: `No Paddle price ID configured for tier: ${tier}` }, { status: 400 });
        }

        const origin = req.headers.get("origin") || "https://keystone.stauniverse.tech";
        const redirectBase = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || origin;

        const base = getPaddleApiBase();
        const res = await fetch(`${base}/transactions`, {
            method: "POST",
            headers: paddleRequestHeaders(),
            body: JSON.stringify({
                items: [{ price_id: priceId, quantity: 1 }],
                collection_mode: "automatic",
                custom_data: {
                    user_id: user.id,
                },
                checkout: {
                    url: `${redirectBase.replace(/\/$/, "")}/app/billing`,
                },
            }),
        });

        const text = await res.text();
        if (!res.ok) {
            console.error("[Paddle] Create transaction failed:", res.status, text);
            return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
        }

        const json = JSON.parse(text) as {
            data?: { checkout?: { url?: string | null } };
        };
        const url = json.data?.checkout?.url;
        if (!url) {
            console.error("[Paddle] Missing checkout.url in response:", text);
            return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 });
        }

        return NextResponse.json({ url });
    } catch (error) {
        console.error("[Paddle] Checkout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
