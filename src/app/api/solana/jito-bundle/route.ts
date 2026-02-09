import { NextResponse } from "next/server";
import bs58 from "bs58";

export const dynamic = "force-dynamic";

/**
 * Jito Bundle Submission API
 *
 * Accepts an array of base64-encoded signed VersionedTransactions,
 * converts them to base58 (Jito's required format), and submits
 * them as an atomic bundle to Jito's block engine.
 *
 * Jito bundles guarantee atomic execution: either ALL transactions
 * in the bundle execute in the same slot, or NONE do. This is
 * critical for arbitrage where the buy and sell legs must execute
 * together to avoid risk.
 *
 * At least one transaction in the bundle MUST include a tip transfer
 * to a Jito tip account to incentivize inclusion.
 */

// Jito block engine endpoints (multiple regions for redundancy)
const JITO_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "No transactions provided" }, { status: 400 });
    }

    if (transactions.length > 5) {
      return NextResponse.json(
        { error: "Too many transactions — Jito bundles support max 5 transactions" },
        { status: 400 }
      );
    }

    // Convert base64-encoded signed transactions to base58 (Jito's expected format)
    const base58Txs: string[] = [];
    for (const b64Tx of transactions) {
      try {
        const bytes = Buffer.from(b64Tx, "base64");
        base58Txs.push(bs58.encode(bytes));
      } catch (encodeErr: any) {
        return NextResponse.json(
          { error: `Failed to encode transaction: ${encodeErr.message}` },
          { status: 400 }
        );
      }
    }

    // Try each Jito endpoint with failover
    let lastError: string = "";
    for (const endpoint of JITO_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const jitoRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [base58Txs],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const jitoData = await jitoRes.json();

        if (jitoData.error) {
          lastError = jitoData.error.message || JSON.stringify(jitoData.error);
          continue; // Try next endpoint
        }

        return NextResponse.json({
          success: true,
          bundleId: jitoData.result,
          endpoint: new URL(endpoint).hostname,
          transactionCount: transactions.length,
        });
      } catch (endpointErr: any) {
        lastError = endpointErr.message || String(endpointErr);
        continue; // Try next endpoint
      }
    }

    // All endpoints failed
    return NextResponse.json(
      { error: `All Jito endpoints failed. Last error: ${lastError}` },
      { status: 502 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
