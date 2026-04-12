#!/usr/bin/env npx tsx
/**
 * Seed Paddle Billing catalog (product + Mini/Max subscription prices) via API.
 *
 * Prerequisites:
 *   - PADDLE_API_KEY in .env.local (or env)
 *   - PADDLE_USE_SANDBOX=true for sandbox API (default true if unset, to avoid accidents)
 *
 * Run:
 *   npm run paddle:seed-catalog
 *
 * Idempotent: looks for product custom_data.catalog_id === "keystone-treasury-os" and
 * price custom_data.keystone_tier === "mini" | "max". Creates only what's missing.
 *
 * After success, add printed PADDLE_PRICE_ID_* values to your deployment env.
 */

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(__dirname, "..");

for (const f of [path.join(ROOT, ".env.local"), path.join(ROOT, ".env")]) {
    if (fs.existsSync(f)) config({ path: f });
}

const PADDLE_API_VERSION = "1";
const CATALOG_ID = "keystone-treasury-os";

function apiBase(): string {
    const key = process.env.PADDLE_API_KEY || "";
    const keyLooksLive = key.includes("pdl_live_apikey") || key.startsWith("pdl_live_");
    const keyLooksSandbox = key.includes("pdl_sdbx_apikey") || key.includes("sandbox");

    let sandbox =
        process.env.PADDLE_USE_SANDBOX === "true" ||
        process.env.PADDLE_USE_SANDBOX === "1" ||
        process.env.PADDLE_ENVIRONMENT === "sandbox";

    if (process.env.PADDLE_USE_SANDBOX === undefined && process.env.PADDLE_ENVIRONMENT === undefined) {
        if (keyLooksLive) sandbox = false;
        else if (keyLooksSandbox) sandbox = true;
        else sandbox = true; // safest default when key shape is unknown
    }

    return sandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
}

function headers(): HeadersInit {
    const key = process.env.PADDLE_API_KEY;
    if (!key) {
        console.error("Missing PADDLE_API_KEY. Set it in .env.local");
        process.exit(1);
    }
    return {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Paddle-Version": PADDLE_API_VERSION,
    };
}

async function paddleJson<T>(method: string, url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
    const res = await fetch(url, {
        method,
        headers: headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data: T;
    try {
        data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
        console.error("Non-JSON response:", text.slice(0, 500));
        throw new Error(`Paddle API ${method} ${url} failed: ${res.status}`);
    }
    return { ok: res.ok, status: res.status, data };
}

type PaddleList<T> = {
    data?: T[];
    meta?: { pagination?: { next?: string; has_more?: boolean } };
};

async function listAllProducts(): Promise<Array<{ id: string; name?: string; custom_data?: Record<string, unknown> }>> {
    const base = apiBase();
    const out: Array<{ id: string; name?: string; custom_data?: Record<string, unknown> }> = [];
    let url: string | null = `${base}/products?per_page=200&status=active`;
    while (url) {
        const res = await fetch(url, { headers: headers() });
        const text = await res.text();
        if (!res.ok) {
            console.error("List products failed:", res.status, text.slice(0, 800));
            throw new Error("list products");
        }
        const json = JSON.parse(text) as PaddleList<{ id: string; name?: string; custom_data?: Record<string, unknown> }>;
        for (const p of json.data || []) out.push(p);
        const pag = json.meta?.pagination;
        url = pag?.has_more && pag?.next ? pag.next : null;
    }
    return out;
}

async function listPricesForProduct(productId: string): Promise<
    Array<{ id: string; custom_data?: Record<string, unknown>; status?: string }>
> {
    const base = apiBase();
    const out: Array<{ id: string; custom_data?: Record<string, unknown>; status?: string }> = [];
    let url: string | null = `${base}/prices?per_page=200&product_id=${encodeURIComponent(productId)}&status=active`;
    while (url) {
        const res = await fetch(url, { headers: headers() });
        const text = await res.text();
        if (!res.ok) {
            console.error("List prices failed:", res.status, text.slice(0, 800));
            throw new Error("list prices");
        }
        const json = JSON.parse(text) as PaddleList<{ id: string; custom_data?: Record<string, unknown>; status?: string }>;
        for (const p of json.data || []) out.push(p);
        const pag = json.meta?.pagination;
        url = pag?.has_more && pag?.next ? pag.next : null;
    }
    return out;
}

function getTierFromPrice(p: { custom_data?: Record<string, unknown> }): string | undefined {
    const t = p.custom_data?.keystone_tier;
    return typeof t === "string" ? t : undefined;
}

async function createProduct(taxCategory: string): Promise<string> {
    const base = apiBase();
    const { ok, status, data } = await paddleJson<{ data?: { id?: string }; error?: { detail?: string } }>(
        "POST",
        `${base}/products`,
        {
            name: "Keystone OS",
            description: "Keystone treasury OS — subscription access (Mini / Max tiers).",
            tax_category: taxCategory,
            custom_data: {
                catalog_id: CATALOG_ID,
            },
        }
    );
    if (!ok) {
        console.error("Create product failed:", status, JSON.stringify(data, null, 2));
        throw new Error("create product");
    }
    const id = data.data?.id;
    if (!id) throw new Error("No product id in response");
    return id;
}

async function createPrice(
    productId: string,
    tier: "mini" | "max",
    amountCents: number,
    trial?: { interval: string; frequency: number }
): Promise<string> {
    const base = apiBase();
    const labels = {
        mini: { name: "Mini — monthly", description: "Keystone Mini plan — monthly subscription" },
        max: { name: "Max — monthly", description: "Keystone Max plan — monthly subscription" },
    };
    const body: Record<string, unknown> = {
        product_id: productId,
        description: labels[tier].description,
        name: labels[tier].name,
        unit_price: {
            amount: String(amountCents),
            currency_code: "USD",
        },
        billing_cycle: {
            interval: "month",
            frequency: 1,
        },
        tax_mode: "account_setting",
        custom_data: {
            keystone_tier: tier,
        },
    };
    if (trial) {
        body.trial_period = trial;
    }

    const { ok, status, data } = await paddleJson<{ data?: { id?: string }; error?: unknown }>("POST", `${base}/prices`, body);
    if (!ok) {
        console.error("Create price failed:", status, JSON.stringify(data, null, 2));
        throw new Error(`create price ${tier}`);
    }
    const id = data.data?.id;
    if (!id) throw new Error(`No price id for ${tier}`);
    return id;
}

async function main() {
    const base = apiBase();
    console.log("Paddle API:", base);

    const miniCents = parseInt(process.env.PADDLE_MINI_UNIT_AMOUNT || "4900", 10);
    const maxCents = parseInt(process.env.PADDLE_MAX_UNIT_AMOUNT || "19900", 10);
    const taxPrimary = process.env.PADDLE_CATALOG_TAX_CATEGORY || "saas";
    const taxFallback = process.env.PADDLE_CATALOG_TAX_CATEGORY_FALLBACK || "standard";

    const trialDays = process.env.PADDLE_TRIAL_DAYS ? parseInt(process.env.PADDLE_TRIAL_DAYS, 10) : 0;
    const trial =
        trialDays > 0 ? { interval: "day" as const, frequency: trialDays } : undefined;

    let productId = process.env.PADDLE_PRODUCT_ID?.trim() || undefined;

    if (!productId) {
        const products = await listAllProducts();
        productId = products.find((p) => p.custom_data?.catalog_id === CATALOG_ID)?.id;
    } else {
        console.log("Using PADDLE_PRODUCT_ID from env:", productId);
    }

    if (!productId) {
        console.log("Creating product (tax_category:", taxPrimary, ")...");
        try {
            productId = await createProduct(taxPrimary);
        } catch {
            console.log("Retrying product with tax_category:", taxFallback);
            productId = await createProduct(taxFallback);
        }
        console.log("Created product:", productId);
    } else {
        console.log("Using existing product:", productId);
    }

    const prices = await listPricesForProduct(productId);
    let miniId = prices.find((p) => getTierFromPrice(p) === "mini")?.id;
    let maxId = prices.find((p) => getTierFromPrice(p) === "max")?.id;

    if (!miniId) {
        console.log("Creating Mini price ($", miniCents / 100, "/mo)...");
        miniId = await createPrice(productId, "mini", miniCents, trial);
        console.log("Created price Mini:", miniId);
    } else {
        console.log("Mini price already exists:", miniId);
    }

    if (!maxId) {
        console.log("Creating Max price ($", maxCents / 100, "/mo)...");
        maxId = await createPrice(productId, "max", maxCents, trial);
        console.log("Created price Max:", maxId);
    } else {
        console.log("Max price already exists:", maxId);
    }

    console.log("\n--- Add to .env.local / hosting ---\n");
    console.log(`PADDLE_PRODUCT_ID=${productId}`);
    console.log(`PADDLE_PRICE_ID_MINI=${miniId}`);
    console.log(`PADDLE_PRICE_ID_MAX=${maxId}`);
    if (base.includes("sandbox")) {
        console.log("\n(Sandbox) Set PADDLE_USE_SANDBOX=true in environments that should hit sandbox-api.paddle.com");
    } else {
        console.log("\n(Live) Set PADDLE_USE_SANDBOX=false for production");
    }
    console.log("\nConfigure webhook destination: https://<your-domain>/api/webhooks/paddle\n");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
