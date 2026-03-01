/**
 * keystone publish — Full pipeline: Gatekeeper → Build → Arweave → On-Chain Registry.
 * Diamond Merge: Hot path (on-chain registry) + Cold path (Arweave permanence).
 *
 * Supports:
 * - Direct Solana keypair for signing
 * - Irys (devnet) upload funded by SOL
 * - On-chain memo registration on Solana devnet/mainnet
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { runGatekeeper } from "./gatekeeper.js";
import { runBuild } from "./build.js";

export interface PublishOptions {
  dir?: string;
  name: string;
  description: string;
  creatorWallet: string;
  apiUrl?: string;
  category?: string;
  skipArweave?: boolean;
  /** Base58 private key for signing tx */
  privateKey?: string;
  /** Solana cluster: devnet (default) or mainnet-beta */
  cluster?: "devnet" | "mainnet-beta";
  /** Register on KeystoneMarket. Pass price in USDC cents. */
  registerMarketplace?: boolean;
  priceUsdc?: number;
}

export interface PublishResult {
  ok: boolean;
  appId?: string;
  arweaveTxId?: string;
  codeHash?: string;
  securityScore?: number;
  solanaTxId?: string;
  explorerUrl?: string;
  error?: string;
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function getClusterUrl(cluster: string): string {
  return cluster === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

/**
 * Upload bundle to Arweave via Irys, funded by SOL.
 */
async function uploadToArweave(
  bundlePath: string,
  privateKey: string | undefined,
  cluster: string
): Promise<string | null> {
  try {
    const Irys = (await import("@irys/sdk")).default;
    const bs58 = (await import("bs58")).default;

    // Configure Irys with Solana wallet
    const irysOpts: any = {
      network: cluster === "mainnet-beta" ? "mainnet" : "devnet",
      token: "solana",
    };

    if (privateKey) {
      irysOpts.key = bs58.decode(privateKey);
      irysOpts.config = { providerUrl: getClusterUrl(cluster) };
    }

    const irys = new Irys(irysOpts);

    // Fund if needed (devnet auto-funds with small amounts)
    if (cluster !== "mainnet-beta") {
      try {
        await irys.fund(irys.utils.toAtomic(0.01)); // Fund 0.01 SOL worth
      } catch (e) {
        console.warn("[publish] Irys fund skipped:", (e as Error).message);
      }
    }

    const bundle = fs.readFileSync(bundlePath, "utf-8");
    const tags = [
      { name: "Content-Type", value: "application/javascript" },
      { name: "App-Name", value: "Keystone-OS" },
      { name: "App-Version", value: "1.0" },
      { name: "Type", value: "mini-app-bundle" },
    ];

    const tx = await irys.upload(bundle, { tags });
    console.log(`  Arweave TX: ${tx?.id}`);
    return tx?.id ?? null;
  } catch (err) {
    console.warn("[publish] Arweave upload failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Register the app on-chain via Solana Memo program.
 * Writes a structured memo containing app metadata + code hash + arweave CID.
 * This is verifiable and permanent on-chain.
 */
async function registerOnChain(opts: {
  privateKey: string;
  cluster: string;
  appId: string;
  name: string;
  description: string;
  codeHash: string;
  arweaveTxId?: string;
  creatorWallet: string;
  priceUsdc?: number;
}): Promise<{ txId: string } | null> {
  try {
    const { Connection, Keypair, Transaction, TransactionInstruction, PublicKey } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;

    const connection = new Connection(getClusterUrl(opts.cluster), "confirmed");
    const keypair = Keypair.fromSecretKey(bs58.decode(opts.privateKey));

    // Memo program ID
    const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

    // Structured memo payload
    const memoData = JSON.stringify({
      protocol: "keystone-os",
      version: "1.0",
      action: "register_app",
      app_id: opts.appId,
      name: opts.name,
      description: opts.description.slice(0, 200),
      code_hash: opts.codeHash,
      arweave_cid: opts.arweaveTxId || null,
      creator: opts.creatorWallet,
      price_usdc: opts.priceUsdc || 0,
      timestamp: Date.now(),
    });

    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, "utf-8"),
    });

    const tx = new Transaction().add(memoInstruction);
    tx.feePayer = keypair.publicKey;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;

    tx.sign(keypair);

    const txId = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Wait for confirmation
    await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "confirmed");

    return { txId };
  } catch (err) {
    console.warn("[publish] On-chain registration failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Register via Keystone API server (non-chain fallback).
 */
async function registerToRegistry(
  apiUrl: string,
  payload: {
    name: string;
    description: string;
    code: string;
    creatorWallet: string;
    arweaveTxId?: string;
    codeHash?: string;
    securityScore?: number;
    category?: string;
  }
): Promise<{ appId: string } | null> {
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/studio/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Registry returned ${res.status}`);
    }
    const json = (await res.json()) as { appId?: string };
    return json?.appId ? { appId: json.appId } : null;
  } catch (err) {
    console.warn("[publish] Registry sync skipped:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function runPublish(options: PublishOptions): Promise<PublishResult> {
  const targetDir = path.resolve(process.cwd(), options.dir ?? ".");
  const appPath = path.join(targetDir, "App.tsx");
  const cluster = options.cluster ?? "devnet";

  if (!fs.existsSync(appPath)) {
    return { ok: false, error: "App.tsx not found. Run keystone init first." };
  }

  const code = fs.readFileSync(appPath, "utf-8");
  const codeJson = JSON.stringify({ files: { "App.tsx": { content: code, language: "typescript" } } });

  // Step 1: Gatekeeper validation
  console.log("  [1/4] Running security gatekeeper...");
  const gatekeeper = runGatekeeper(targetDir);
  if (!gatekeeper.ok) {
    return {
      ok: false,
      error: `Gatekeeper failed (score: ${gatekeeper.securityScore}). Fix errors:\n${gatekeeper.errors.map((e) => `  ${e.file}:${e.line} — ${e.message}`).join("\n")}`,
      securityScore: gatekeeper.securityScore,
    };
  }
  console.log(`  Security: ${gatekeeper.securityScore}/100`);

  // Step 2: Build
  console.log("  [2/4] Building bundle...");
  const build = await runBuild({ dir: targetDir, outDir: path.join(targetDir, ".keystone", "dist") });
  if (!build.ok) {
    return { ok: false, error: build.error };
  }

  const bundlePath = build.outputPath!;
  const bundleContent = fs.readFileSync(bundlePath, "utf-8");
  const codeHash = sha256Hex(bundleContent);
  console.log(`  Code hash: ${codeHash.slice(0, 16)}...`);

  // Step 3: Arweave upload
  let arweaveTxId: string | null = null;
  if (!options.skipArweave && options.privateKey) {
    console.log("  [3/4] Uploading to Arweave via Irys...");
    arweaveTxId = await uploadToArweave(bundlePath, options.privateKey, cluster);
    if (arweaveTxId) {
      console.log(`  Arweave: https://arweave.net/${arweaveTxId}`);
    }
  } else if (!options.skipArweave) {
    console.log("  [3/4] Arweave skipped (no private key provided)");
  } else {
    console.log("  [3/4] Arweave skipped (--skip-arweave)");
  }

  const finalAppId = `app_${Date.now().toString(36)}`;

  // Step 4: On-chain registration
  let solanaTxId: string | undefined;
  let explorerUrl: string | undefined;
  if (options.privateKey) {
    console.log("  [4/4] Registering on Solana...");
    const onChain = await registerOnChain({
      privateKey: options.privateKey,
      cluster,
      appId: finalAppId,
      name: options.name,
      description: options.description,
      codeHash,
      arweaveTxId: arweaveTxId ?? undefined,
      creatorWallet: options.creatorWallet,
      priceUsdc: options.priceUsdc,
    });
    if (onChain) {
      solanaTxId = onChain.txId;
      explorerUrl = `https://explorer.solana.com/tx/${solanaTxId}?cluster=${cluster}`;
      console.log(`  Solana TX: ${solanaTxId}`);
    }
  } else {
    console.log("  [4/4] On-chain registration skipped (no private key)");
  }

  // Also try API registry if URL provided
  if (options.apiUrl) {
    await registerToRegistry(options.apiUrl, {
      name: options.name,
      description: options.description,
      code: codeJson,
      creatorWallet: options.creatorWallet,
      arweaveTxId: arweaveTxId ?? undefined,
      codeHash,
      securityScore: gatekeeper.securityScore,
      category: options.category ?? "utility",
    });
  }

  return {
    ok: true,
    appId: finalAppId,
    arweaveTxId: arweaveTxId ?? undefined,
    codeHash,
    securityScore: gatekeeper.securityScore,
    solanaTxId,
    explorerUrl,
  };
}
