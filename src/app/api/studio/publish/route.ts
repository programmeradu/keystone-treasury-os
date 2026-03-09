/**
 * POST /api/studio/publish — Register Mini-App to marketplace (Hot Path).
 * Receives: name, description, code, creatorWallet, arweaveTxId, codeHash, securityScore.
 * Part of keystone publish pipeline — Diamond Merge architecture.
 *
 * Auth: Three modes (checked in order):
 *   1. Bearer token (from `keystone register`) — Authorization: Bearer <token>
 *   2. Wallet signature — X-Keystone-Wallet + X-Keystone-Signature + X-Keystone-Nonce
 *   3. Cookie session — browser-based publish (SIWS or Neon Auth, checked by middleware)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { miniApps, developerTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

/**
 * Verify a developer bearer token from the Authorization header.
 * Returns the wallet address if valid, null otherwise.
 */
async function verifyBearerToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!db || !token) return null;

  const results = await db
    .select()
    .from(developerTokens)
    .where(and(eq(developerTokens.token, token), eq(developerTokens.revoked, false)))
    .limit(1);

  if (results.length === 0) return null;

  // Update last used timestamp
  await db
    .update(developerTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(developerTokens.token, token));

  return results[0].walletAddress;
}

/**
 * Verify a wallet signature against a nonce.
 * Uses tweetnacl (bundled with Next.js via @solana/web3.js peer).
 */
async function verifyWalletSignature(request: NextRequest): Promise<string | null> {
  const wallet = request.headers.get("x-keystone-wallet");
  const signature = request.headers.get("x-keystone-signature");
  const nonce = request.headers.get("x-keystone-nonce");

  if (!wallet || !signature || !nonce) return null;

  // Validate nonce timestamp (5 min TTL)
  const parts = nonce.split(":");
  const timestamp = parseInt(parts[parts.length - 1], 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) return null;

  try {
    // Dynamic import to avoid bundling issues
    const { PublicKey } = await import("@solana/web3.js");
    const nacl = await import("tweetnacl");
    const bs58 = (await import("bs58")).default;

    const publicKey = new PublicKey(wallet);
    const messageBytes = new TextEncoder().encode(nonce);
    const signatureBytes = bs58.decode(signature);

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    return valid ? wallet : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: marketplace listings
    const rateLimit = await checkRouteLimit(request, 'marketplace_listings');
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        tier: rateLimit.tier,
        resetAt: rateLimit.resetAt.toISOString(),
      }, { status: 429 });
    }

    // ─── Auth: check bearer token → wallet signature → cookie (middleware) ──
    const hasBearerOrSignature =
      request.headers.has("authorization") ||
      request.headers.has("x-keystone-signature");

    let authedWallet: string | null = null;

    if (hasBearerOrSignature) {
      // Try bearer token first, then wallet signature
      authedWallet =
        (await verifyBearerToken(request)) ??
        (await verifyWalletSignature(request));

      if (!authedWallet) {
        return NextResponse.json(
          { error: "Invalid credentials. Run `keystone register` to get a token." },
          { status: 401 }
        );
      }
    }
    // If no bearer/signature headers, middleware already validated cookies

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      code?: string;
      creatorWallet?: string;
      arweaveTxId?: string;
      codeHash?: string;
      securityScore?: number;
      category?: string;
    };

    const { name, description, code, creatorWallet, arweaveTxId, codeHash, securityScore, category } = body;

    if (!name || !description || !code || !creatorWallet) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, code, creatorWallet" },
        { status: 400 }
      );
    }

    // If authenticated via bearer/signature, ensure wallet matches
    if (authedWallet && authedWallet !== creatorWallet) {
      return NextResponse.json(
        { error: "creatorWallet does not match authenticated wallet" },
        { status: 403 }
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const id = `app_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

    await db.insert(miniApps).values({
      id,
      name,
      description,
      code: JSON.parse(code) as Record<string, unknown>,
      creatorWallet,
      version: "1.0.0",
      creatorShare: '0.8',
      isPublished: true,
      priceUsdc: '0',
      category: category ?? "utility",
      codeHash: codeHash ?? null,
      arweaveTxId: arweaveTxId ?? null,
      securityScore: securityScore ?? null,
      lastScanAt: new Date(),
    });

    return NextResponse.json({ appId: id });
  } catch (err) {
    console.error("[publish] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
