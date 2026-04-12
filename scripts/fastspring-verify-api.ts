#!/usr/bin/env npx tsx
/**
 * Verify FastSpring API credentials (Basic auth) with a minimal read.
 *
 * Run: npm run fastspring:verify-api
 */

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

const ROOT = path.resolve(__dirname, "..");
for (const f of [path.join(ROOT, ".env.local"), path.join(ROOT, ".env")]) {
    if (fs.existsSync(f)) config({ path: f });
}

const API_BASE = "https://api.fastspring.com";
const USER_AGENT = "KeystoneTreasuryOS/1.0 (fastspring-verify-api)";

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
    const url = `${API_BASE}/accounts?limit=1`;
    const res = await fetch(url, {
        headers: { Authorization: authHeader(), "User-Agent": USER_AGENT },
    });
    const text = await res.text();
    console.log("GET /accounts?limit=1 →", res.status);
    try {
        console.log(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
        console.log(text.slice(0, 2000));
    }
    if (!res.ok) process.exit(1);
    console.log("\nAPI credentials are valid.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
