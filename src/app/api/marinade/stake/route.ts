import { NextRequest } from "next/server";
import { Connection, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import { Marinade, MarinadeConfig } from "@marinade.finance/marinade-ts-sdk";

// Build an unsigned legacy Transaction for staking SOL to mSOL via Marinade.
// Client will sign and send using wallet-adapter.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = body?.userPublicKey as string | undefined;
    const amountLamports = Number(body?.amountLamports);

    if (!user || !Number.isFinite(amountLamports) || amountLamports <= 0) {
      return new Response(
        JSON.stringify({ error: "Missing userPublicKey or invalid amountLamports" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPk = new PublicKey(user);

    // Prefer an RPC from env if provided, else default to mainnet public RPC
    const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta");
    const connection = new Connection(rpcUrl, "confirmed");

    const config = new MarinadeConfig({ connection });
    const marinade = new Marinade(config);

    // Build the deposit transaction (legacy) without signing
    const { transaction } = await marinade.deposit(amountLamports);

    // Ensure fee payer and blockhash are set for client to sign
    const { blockhash } = await connection.getLatestBlockhash({ commitment: "finalized" });
    transaction.feePayer = userPk;
    transaction.recentBlockhash = blockhash;

    // Return base64 for client-side send
    const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
    const b64 = Buffer.from(serialized).toString("base64");

    return new Response(
      JSON.stringify({ transaction: b64, asLegacyTransaction: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Marinade stake proxy error", details: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}