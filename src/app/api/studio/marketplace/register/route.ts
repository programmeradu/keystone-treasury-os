/**
 * POST /api/studio/marketplace/register — Register app on-chain (KeystoneMarket).
 * Called after publish to initialize AppRegistry on Solana.
 *
 * Requires: wallet signature, app_id, price_usdc, ipfs_cid (from Arweave).
 */

import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";

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

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    if (body.signedTx) {
      const txBuffer = Buffer.from(body.signedTx, "base64");
      const txSignature = await connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      return NextResponse.json({
        status: "success",
        txSignature,
        appId,
      });
    }

    const PROGRAM_ID = new PublicKey("F8kN2gs4kqHtz2bkJZLbtNm6j8e7EUSarYDQcXff8iQY");

    // 1. Derive app_id as [u8; 32] from appId string (hash)
    const appIdBytes = Buffer.alloc(32);
    Buffer.from(appId, "utf-8").copy(appIdBytes, 0, 0, Math.min(appId.length, 32));

    // 2. Derive ipfs_cid as [u8; 64] from ipfsCid (pad/truncate)
    const ipfsCidBytes = Buffer.alloc(64);
    Buffer.from(ipfsCid, "utf-8").copy(ipfsCidBytes, 0, 0, Math.min(ipfsCid.length, 64));

    // Compute Anchor discriminator
    const encoder = new TextEncoder();
    const discData = encoder.encode("global:initialize_app");
    const hashBuffer = await crypto.subtle.digest("SHA-256", discData as any);
    const disc = Buffer.from(new Uint8Array(hashBuffer).slice(0, 8));

    let parsedPrice = Number(priceUsdc) || 0;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      parsedPrice = 0;
    }
    const priceUsdcBigInt = BigInt(Math.round(parsedPrice * 1_000_000));
    const developerFeeBps = 8000;

    const data = Buffer.alloc(8 + 32 + 8 + 2 + 64);
    disc.copy(data, 0);
    appIdBytes.copy(data, 8);
    data.writeBigUInt64LE(priceUsdcBigInt, 40);
    data.writeUInt16LE(developerFeeBps, 48);
    ipfsCidBytes.copy(data, 50);

    const [appRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("app_registry"), appIdBytes],
      PROGRAM_ID
    );

    const developerWalletPubkey = new PublicKey(developerWallet);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: appRegistryPda, isSigner: false, isWritable: true },
        { pubkey: developerWalletPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data,
    });

    const tx = new Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = developerWalletPubkey;

    const serializedTx = tx.serialize({ requireAllSignatures: false }).toString("base64");

    return NextResponse.json({
      status: "requires_signature",
      transaction: serializedTx,
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
