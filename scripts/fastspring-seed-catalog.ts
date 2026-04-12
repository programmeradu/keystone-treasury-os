#!/usr/bin/env npx tsx
/**
 * Create or update Keystone Mini/Max subscription products in FastSpring via API.
 *
 * Docs: https://developer.fastspring.com/reference/create-or-update-products
 *
 * Env (.env.local):
 *   FASTSPRING_API_USERNAME  — from Developer Tools → APIs → API Credentials
 *   FASTSPRING_API_PASSWORD  — shown once at creation
 *
 * Optional:
 *   FASTSPRING_PRODUCT_PATH_MINI / FASTSPRING_MINI_PRODUCT_PATH (default: keystone-os-mini)
 *   FASTSPRING_PRODUCT_PATH_MAX / FASTSPRING_MAX_PRODUCT_PATH (default: keystone-os-max)
 *   FASTSPRING_MINI_USD (default: 49)
 *   FASTSPRING_MAX_USD (default: 199)
 *   FASTSPRING_TRIAL_DAYS — if set, adds a trial period in days to both products
 *
 * Run: npm run fastspring:seed-catalog
 */

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(__dirname, "..");
for (const f of [path.join(ROOT, ".env.local"), path.join(ROOT, ".env")]) {
    if (fs.existsSync(f)) config({ path: f });
}

const API_BASE = "https://api.fastspring.com";
const USER_AGENT = "KeystoneTreasuryOS/1.0 (fastspring-seed-catalog)";

function authHeader(): string {
    const user = process.env.FASTSPRING_API_USERNAME?.trim();
    const pass = process.env.FASTSPRING_API_PASSWORD?.trim();
    if (!user || !pass) {
        console.error("Set FASTSPRING_API_USERNAME and FASTSPRING_API_PASSWORD in .env.local");
        process.exit(1);
    }
    return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

type ProductPayload = {
    product: string;
    display: { en: string };
    description?: {
        summary?: { en: string };
        action?: { en: string };
    };
    format: string;
    pricing: Record<string, unknown>;
    attributes?: Record<string, string>;
};

async function main() {
    const miniPath =
        process.env.FASTSPRING_PRODUCT_PATH_MINI?.trim() ||
        process.env.FASTSPRING_MINI_PRODUCT_PATH?.trim() ||
        "keystone-os-mini";
    const maxPath =
        process.env.FASTSPRING_PRODUCT_PATH_MAX?.trim() ||
        process.env.FASTSPRING_MAX_PRODUCT_PATH?.trim() ||
        "keystone-os-max";
    const miniUsd = parseFloat(process.env.FASTSPRING_MINI_USD || "49");
    const maxUsd = parseFloat(process.env.FASTSPRING_MAX_USD || "199");
    const trialDays = process.env.FASTSPRING_TRIAL_DAYS ? parseInt(process.env.FASTSPRING_TRIAL_DAYS, 10) : 0;

    const basePricing = (usd: number): Record<string, unknown> => {
        const p: Record<string, unknown> = {
            price: { USD: usd },
            interval: "month",
            intervalLength: 1,
            paymentCollected: true,
            paidTrial: false,
            quantityDefault: 1,
            quantityBehavior: "allow",
        };
        if (trialDays > 0) {
            p.trial = trialDays;
        }
        return p;
    };

    const products: ProductPayload[] = [
        {
            product: miniPath,
            display: { en: "Keystone OS — Mini" },
            description: {
                summary: { en: "Monthly subscription — Mini plan (growing squads)." },
                action: { en: "Subscribe to upgrade your Keystone workspace." },
            },
            format: "digital",
            pricing: basePricing(miniUsd),
            attributes: { keystone_tier: "mini" },
        },
        {
            product: maxPath,
            display: { en: "Keystone OS — Max" },
            description: {
                summary: { en: "Monthly subscription — Max plan (enterprise nexus)." },
                action: { en: "Subscribe for unlimited scale and priority capabilities." },
            },
            format: "digital",
            pricing: basePricing(maxUsd),
            attributes: { keystone_tier: "max" },
        },
    ];

    const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: {
            Authorization: authHeader(),
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ products }),
    });

    const text = await res.text();
    let json: unknown;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        console.error("Non-JSON response:", text.slice(0, 1000));
        process.exit(1);
    }

    if (!res.ok) {
        console.error("FastSpring API error:", res.status);
        console.error(JSON.stringify(json, null, 2));
        process.exit(1);
    }

    console.log("FastSpring response:\n", JSON.stringify(json, null, 2));

    console.log("\n--- Add to .env.local / hosting (for your app integration) ---\n");
    console.log(`FASTSPRING_PRODUCT_PATH_MINI=${miniPath}`);
    console.log(`FASTSPRING_PRODUCT_PATH_MAX=${maxPath}`);
    console.log("\nUse these product path IDs in checkout links, webhooks, or Store Builder.");
    console.log("Dashboard: Products should appear under Catalog.\n");

    console.log("--- Web checkout (Sessions v2) ---");
    console.log(
        "Create a Web Checkout in the FastSpring app and copy store-id/checkout-id into FASTSPRING_CHECKOUT_PATH."
    );
    console.log(
        "There is no REST endpoint to create that checkout id; it comes from storefront configuration.\n"
    );

    console.log("--- Webhooks ---");
    console.log(
        "1) In FastSpring: Developer Tools → Webhooks → add URL (e.g. https://<domain>/api/webhooks/fastspring) and select events."
    );
    console.log(
        "2) Run: npm run fastspring:set-webhook-hmac  (uses POST /webhooks/keys — URL must already exist in the dashboard).\n"
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
