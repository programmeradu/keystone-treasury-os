/**
 * POST /api/studio/publish/register — Register a developer via Turnkey.
 *
 * Creates a Turnkey sub-org with a Solana wallet (no passkey/WebAuthn needed).
 * Returns { walletAddress, developerToken } for CLI to store in keystone.config.json.
 *
 * Also supports BYO-key registration: provide { walletAddress } to register
 * an existing wallet and get a token back.
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { db } from "@/db";
import { developerTokens } from "@/db/schema";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRouteLimit(request, "developer_registrations");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", resetAt: rateLimit.resetAt.toISOString() },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      label?: string;
      walletAddress?: string; // BYO-key mode
    };

    const label = body.label || "default";

    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    // ─── Path A: BYO Key — just register the wallet and issue a token ──
    if (body.walletAddress) {
      // Check if token already exists for this wallet
      const existing = await db
        .select()
        .from(developerTokens)
        .where(
          and(
            eq(developerTokens.walletAddress, body.walletAddress),
            eq(developerTokens.revoked, false)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({
          walletAddress: existing[0].walletAddress,
          developerToken: existing[0].token,
          mode: "existing",
        });
      }

      const token = crypto.randomUUID();
      await db.insert(developerTokens).values({
        token,
        walletAddress: body.walletAddress,
        label,
      });

      return NextResponse.json({
        walletAddress: body.walletAddress,
        developerToken: token,
        mode: "byo-key",
      });
    }

    // ─── Path B: Turnkey-provisioned wallet ────────────────────────────
    const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
    const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;
    const organizationId =
      process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID ||
      process.env.NEXT_PUBLIC_TURNKEY_ORG_ID ||
      process.env.TURNKEY_ORG_ID;

    if (!apiPublicKey || !apiPrivateKey || !organizationId) {
      return NextResponse.json(
        { error: "Turnkey not configured. Use --wallet flag for BYO-key mode." },
        { status: 503 }
      );
    }

    const stamper = new ApiKeyStamper({ apiPublicKey, apiPrivateKey });

    // Create sub-org with an API-only user (no passkey needed for CLI)
    const subOrgName = `keystone-dev-${label}-${Date.now()}`;

    // Generate an API key pair for the sub-org user
    const apiKeyName = `cli-key-${Date.now()}`;

    const requestBody = {
      type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
      timestampMs: Date.now().toString(),
      organizationId,
      parameters: {
        subOrganizationName: subOrgName,
        rootQuorumThreshold: 1,
        rootUsers: [
          {
            userName: `developer-${label}`,
            userEmail: `dev-${Date.now()}@keystone.os`,
            apiKeys: [],
            oauthProviders: [],
            authenticators: [],
          },
        ],
        wallet: {
          walletName: `Keystone Developer Wallet`,
          accounts: [
            {
              curve: "CURVE_ED25519",
              pathFormat: "PATH_FORMAT_BIP32",
              path: "m/44'/501'/0'/0'",
              addressFormat: "ADDRESS_FORMAT_SOLANA",
            },
          ],
        },
      },
    };

    const bodyString = JSON.stringify(requestBody);
    const stamp = await stamper.stamp(bodyString);

    const response = await fetch(
      "https://api.turnkey.com/public/v1/submit/create_sub_organization",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [stamp.stampHeaderName]: stamp.stampHeaderValue,
        },
        body: bodyString,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[register] Turnkey error:", result);
      return NextResponse.json(
        { error: result.message || "Turnkey wallet creation failed" },
        { status: 502 }
      );
    }

    const subOrgId =
      result?.activity?.result?.createSubOrganizationResultV7
        ?.subOrganizationId || "";

    const walletAddress =
      result?.activity?.result?.createSubOrganizationResultV7?.wallet
        ?.addresses?.[0] || "";

    if (!walletAddress) {
      console.error("[register] No wallet address in Turnkey response:", JSON.stringify(result, null, 2));
      return NextResponse.json(
        { error: "Turnkey wallet created but no address returned" },
        { status: 502 }
      );
    }

    // Store developer token
    const token = crypto.randomUUID();
    await db.insert(developerTokens).values({
      token,
      walletAddress,
      turnkeySubOrgId: subOrgId,
      label,
    });

    return NextResponse.json({
      walletAddress,
      developerToken: token,
      turnkeySubOrgId: subOrgId,
      mode: "turnkey",
    });
  } catch (err) {
    console.error("[register] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed" },
      { status: 500 }
    );
  }
}
