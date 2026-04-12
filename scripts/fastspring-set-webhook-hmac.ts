#!/usr/bin/env npx tsx
/**
 * Set the HMAC signing secret for an existing FastSpring webhook URL via API.
 *
 * Official endpoint: POST https://api.fastspring.com/webhooks/keys
 * Docs: https://developer.fastspring.com/reference/update-a-webhook-key-secret
 *
 * Prerequisite (dashboard — no public API for this step):
 *   Developer Tools → Webhooks → add your HTTPS URL and select subscription/order events.
 *   The URL you register must match FASTSPRING_WEBHOOK_URL below exactly.
 *
 * Env (.env.local):
 *   FASTSPRING_API_USERNAME, FASTSPRING_API_PASSWORD
 *   FASTSPRING_WEBHOOK_URL — full URL, e.g. https://your.domain/api/webhooks/fastspring
 *   FASTSPRING_WEBHOOK_SECRET — new secret (max 100 characters per FastSpring)
 *
 * Run: npm run fastspring:set-webhook-hmac
 */

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(__dirname, "..");
for (const f of [path.join(ROOT, ".env.local"), path.join(ROOT, ".env")]) {
    if (fs.existsSync(f)) config({ path: f });
}

const API_BASE = "https://api.fastspring.com";
const USER_AGENT = "KeystoneTreasuryOS/1.0 (fastspring-set-webhook-hmac)";

function authHeader(): string {
    const user = process.env.FASTSPRING_API_USERNAME?.trim();
    const pass = process.env.FASTSPRING_API_PASSWORD?.trim();
    if (!user || !pass) {
        console.error("Set FASTSPRING_API_USERNAME and FASTSPRING_API_PASSWORD");
        process.exit(1);
    }
    return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

async function main() {
    const url = process.env.FASTSPRING_WEBHOOK_URL?.trim();
    const hmacSecret = process.env.FASTSPRING_WEBHOOK_SECRET?.trim();

    if (!url || !/^https:\/\//i.test(url)) {
        console.error("Set FASTSPRING_WEBHOOK_URL to your full HTTPS webhook URL (as registered in FastSpring).");
        process.exit(1);
    }
    if (!hmacSecret || hmacSecret.length > 100) {
        console.error("Set FASTSPRING_WEBHOOK_SECRET (1–100 characters).");
        process.exit(1);
    }

    const res = await fetch(`${API_BASE}/webhooks/keys`, {
        method: "POST",
        headers: {
            Authorization: authHeader(),
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ url, hmacSecret }),
    });

    const text = await res.text();
    let json: unknown;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        console.error("Non-JSON response:", text.slice(0, 800));
        process.exit(1);
    }

    if (!res.ok) {
        console.error("FastSpring API error:", res.status);
        console.error(JSON.stringify(json, null, 2));
        process.exit(1);
    }

    console.log("FastSpring webhook HMAC updated:\n", JSON.stringify(json, null, 2));
    console.log("\nUse the same FASTSPRING_WEBHOOK_SECRET in your app environment for signature verification.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
