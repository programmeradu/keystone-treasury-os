import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * POST /api/lemon-squeezy/checkout
 * Generates a Lemon Squeezy checkout URL for the given tier.
 * 
 * Body: { tier: "mini" | "max" }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { tier } = await req.json();

        const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        const miniVariantId = process.env.LEMON_SQUEEZY_MINI_VARIANT_ID;
        const maxVariantId = process.env.LEMON_SQUEEZY_MAX_VARIANT_ID;

        if (!apiKey || !storeId) {
            return NextResponse.json({ error: "Lemon Squeezy not configured" }, { status: 503 });
        }

        const variantId = tier === "max" ? maxVariantId : miniVariantId;
        if (!variantId) {
            return NextResponse.json({ error: `No variant configured for tier: ${tier}` }, { status: 400 });
        }

        // Determine the base URL dynamically for subdomains, falling back to keystone.stauniverse.tech
        const origin = req.headers.get("origin") || "https://keystone.stauniverse.tech";
        const redirectBase = process.env.NEXT_PUBLIC_APP_URL || origin;

        // Generate checkout via Lemon Squeezy API
        const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/vnd.api+json",
                "Accept": "application/vnd.api+json",
            },
            body: JSON.stringify({
                data: {
                    type: "checkouts",
                    attributes: {
                        checkout_data: {
                            custom: {
                                user_id: user.id,
                            },
                        },
                        product_options: {
                            redirect_url: `${redirectBase}/app/billing?success=true`,
                        },
                    },
                    relationships: {
                        store: {
                            data: { type: "stores", id: storeId },
                        },
                        variant: {
                            data: { type: "variants", id: variantId },
                        },
                    },
                },
            }),
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error("[Lemon Squeezy] Checkout creation failed:", errorBody);
            return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
        }

        const data = await res.json();
        const checkoutUrl = data.data?.attributes?.url;

        return NextResponse.json({ url: checkoutUrl });
    } catch (error) {
        console.error("[Lemon Squeezy] Checkout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
