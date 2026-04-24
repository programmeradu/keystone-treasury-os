/**
 * POST /api/studio/marketplace/register — Register app on-chain (KeystoneMarket).
 * Called after publish to initialize AppRegistry on Solana.
 *
 * Requires: wallet signature, app_id, price_usdc, ipfs_cid (from Arweave).
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      appId?: string;
      priceUsdc?: number;
      ipfsCid?: string;
      developerWallet?: string;
      signedTx?: string;
    };

    const { appId, priceUsdc, ipfsCid, developerWallet } = body;

    if (!appId || priceUsdc == null || !ipfsCid || !developerWallet) {
      return NextResponse.json(
        { error: "Missing: appId, priceUsdc, ipfsCid, developerWallet" },
        { status: 400 }
      );
    }

        // Phase 2 implementation of on-chain registration is pending.
    // The current architecture relies on the client (browser) to use the SDK
    // \`useTurnkey().signTransaction()\` for the \`initialize_app\` instruction
    // because server-side signing for non-custodial apps violates the non-custodial
    // security model unless a delegated/ephemeral key is explicitly granted.
    // For now, we return a 202 Accepted to indicate the payload is valid
    // and instruct the client to perform the on-chain submission.

    return NextResponse.json({
      status: "pending",
      message: "On-chain registration requires wallet signing. Use SDK useTurnkey().signTransaction() with initialize_app instruction.",
      appId,
    });
  } catch (err) {
    console.error("[marketplace/register] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed" },
      { status: 500 }
    );
  }
}
