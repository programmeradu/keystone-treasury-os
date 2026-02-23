/**
 * Keystone Proxy Gate — /api/proxy
 * 
 * All Mini-App external HTTP requests route through this endpoint.
 * Implements a two-tier domain allowlist (global + per-app manifest),
 * rate limiting, header sanitization, and server-side API key injection.
 * 
 * [KIMI-2.5] — External Connectivity & Sandbox IO
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Global Allowlist (Tier 1) ──────────────────────────────────────
// Domains available to ALL Mini-Apps by default. Curated by Keystone team.

const GLOBAL_ALLOWLIST = new Set([
  // Jupiter (Swap aggregator)
  "api.jup.ag",
  "quote-api.jup.ag", // Legacy — kept for backwards compatibility
  "price.jup.ag",
  "token.jup.ag",
  "dev.jup.ag",

  // Raydium
  "api.raydium.io",
  "api-v3.raydium.io",

  // Birdeye (Token analytics)
  "public-api.birdeye.so",

  // Helius (RPC + DAS)
  "api.helius.xyz",
  "rpc.helius.xyz",

  // CoinGecko (Price data)
  "api.coingecko.com",
  "pro-api.coingecko.com",

  // DexScreener
  "api.dexscreener.com",

  // Solana public RPCs (read-only)
  "api.mainnet-beta.solana.com",
  "api.devnet.solana.com",

  // RugCheck
  "api.rugcheck.xyz",

  // Realms / Governance
  "app.realms.today",

  // Pyth (Price feeds)
  "hermes.pyth.network",

  // Tensor (NFT)
  "api.tensor.so",
]);

// ─── API Key Injection (server-side, never exposed to client) ───────

const API_KEY_INJECTION: Record<string, { header: string; envVar: string }> = {
  "api.helius.xyz":        { header: "Authorization",     envVar: "HELIUS_API_KEY" },
  "rpc.helius.xyz":        { header: "Authorization",     envVar: "HELIUS_API_KEY" },
  "public-api.birdeye.so": { header: "X-API-KEY",         envVar: "BIRDEYE_API_KEY" },
  "pro-api.coingecko.com": { header: "X-Cg-Pro-Api-Key",  envVar: "COINGECKO_PRO_KEY" },
};

// ─── Rate Limiting ──────────────────────────────────────────────────

const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;       // requests per window
const RATE_WINDOW = 60_000;  // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Size Limits ────────────────────────────────────────────────────

const MAX_REQUEST_BODY  = 1024 * 100;   // 100KB
const MAX_RESPONSE_BODY = 1024 * 1024;  // 1MB

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, method, headers, body: requestBody, appId } = body;

    // ─── 1. URL Validation ────────────────────────────────
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // ─── 2. HTTPS Only ───────────────────────────────────
    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTPS URLs are allowed" },
        { status: 400 }
      );
    }

    // ─── 3. Domain Allowlist Check ────────────────────────
    const domain = parsedUrl.hostname;
    let allowed = GLOBAL_ALLOWLIST.has(domain);

    // Tier 2: Check app-specific manifest allowlist (future: read from DB)
    // For now, apps can declare allowedDomains in their manifest stored in the DB.
    // This will be wired up when the marketplace schema includes manifest data.
    if (!allowed && appId) {
      try {
        const { marketplace } = await import("@/lib/studio/marketplace");
        const app = await marketplace.getAppById(appId);
        if (app?.tags) {
          // tags field temporarily used for manifest data until schema upgrade
          const tags = typeof app.tags === "string" ? JSON.parse(app.tags) : app.tags;
          if (Array.isArray(tags?.allowedDomains)) {
            allowed = tags.allowedDomains.includes(domain);
          }
        }
      } catch {
        // DB not available or app not found — that's fine, just deny
      }
    }

    if (!allowed) {
      return NextResponse.json(
        {
          error: `Domain "${domain}" is not in the allowlist. Add it to your keystone.manifest.json "allowedDomains" array.`,
        },
        { status: 403 }
      );
    }

    // ─── 4. Rate Limit ───────────────────────────────────
    const rateLimitKey = appId || "global";
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Rate limit exceeded (60 requests/minute). Please slow down." },
        { status: 429 }
      );
    }

    // ─── 5. Method Whitelist ─────────────────────────────
    const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const httpMethod = (method || "GET").toUpperCase();
    if (!allowedMethods.includes(httpMethod)) {
      return NextResponse.json(
        { error: `HTTP method "${method}" is not allowed` },
        { status: 400 }
      );
    }

    // ─── 6. Request Body Size Check ──────────────────────
    if (requestBody && JSON.stringify(requestBody).length > MAX_REQUEST_BODY) {
      return NextResponse.json(
        { error: "Request body exceeds 100KB limit" },
        { status: 413 }
      );
    }

    // ─── 7. Sanitize Headers ─────────────────────────────
    const sanitizedHeaders: Record<string, string> = {};
    const blockedHeaders = [
      "cookie", "authorization", "x-api-key",
      "host", "origin", "referer",
    ];

    for (const [key, value] of Object.entries(headers || {})) {
      if (!blockedHeaders.includes(key.toLowerCase())) {
        sanitizedHeaders[key] = value as string;
      }
    }

    sanitizedHeaders["User-Agent"] = "Keystone-Proxy/1.0";
    sanitizedHeaders["X-Forwarded-By"] = "keystone-studio";

    // ─── 8. Inject API Keys (server-side) ────────────────
    const keyConfig = API_KEY_INJECTION[domain];
    if (keyConfig) {
      const apiKey = process.env[keyConfig.envVar];
      if (apiKey) {
        sanitizedHeaders[keyConfig.header] =
          keyConfig.header === "Authorization" ? `Bearer ${apiKey}` : apiKey;
      }
    }

    // ─── 9. Execute Upstream Request ─────────────────────
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: sanitizedHeaders,
      signal: AbortSignal.timeout(15000), // 15s timeout
    };

    if (requestBody && httpMethod !== "GET") {
      fetchOptions.body =
        typeof requestBody === "string"
          ? requestBody
          : JSON.stringify(requestBody);
      sanitizedHeaders["Content-Type"] =
        sanitizedHeaders["Content-Type"] || "application/json";
    }

    const response = await fetch(url, fetchOptions);

    // ─── 10. Process Response ────────────────────────────
    const contentType = response.headers.get("content-type") || "";
    let responseData: unknown;

    if (contentType.includes("application/json")) {
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BODY) {
        return NextResponse.json(
          { error: "Response exceeds 1MB limit" },
          { status: 502 }
        );
      }
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    } else {
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BODY) {
        return NextResponse.json(
          { error: "Response exceeds 1MB limit" },
          { status: 502 }
        );
      }
      responseData = text;
    }

    return NextResponse.json({
      data: responseData,
      status: response.status,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));

    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Upstream request timed out (15s)" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: `Proxy error: ${error.message}` },
      { status: 502 }
    );
  }
}
