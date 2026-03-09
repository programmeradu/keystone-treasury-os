/**
 * GET /api/studio/publish/auth — Issue a challenge nonce for wallet-signature auth.
 *
 * The CLI fetches this nonce, signs it with the developer's private key,
 * and sends the signature back with the publish request.
 * Nonce is self-validating (contains timestamp) — no server-side storage needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

export async function GET(request: NextRequest) {
  const rateLimit = await checkRouteLimit(request, "marketplace_listings");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rateLimit.resetAt.toISOString() },
      { status: 429 }
    );
  }

  const nonce = `keystone-publish:${crypto.randomUUID()}:${Date.now()}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  return NextResponse.json({ nonce, expiresAt });
}
