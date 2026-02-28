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

    // TODO: Build and send initialize_app transaction via Turnkey/wallet
    // 1. Derive app_id as [u8; 32] from appId string (hash)
    // 2. Derive ipfs_cid as [u8; 64] from ipfsCid (pad/truncate)
    // 3. Build instruction, sign with developer wallet, send
    // 4. Return tx signature

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
