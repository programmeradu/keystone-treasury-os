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
  /** Bearer token from keystone register */
  bearerToken?: string;
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
    // @ts-ignore
    const Irys = (await import("@irys/sdk")).default;
    // @ts-ignore
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
 * Register the app on-chain via Keystone Marketplace Anchor program.
 * Calls the `initialize_app` instruction to create an AppRegistry PDA.
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
    const { Connection, Keypair, Transaction, TransactionInstruction, PublicKey, SystemProgram } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const cryptoModule = await import("node:crypto");

    const PROGRAM_ID = new PublicKey("F8kN2gs4kqHtz2bkJZLbtNm6j8e7EUSarYDQcXff8iQY");

    const connection = new Connection(getClusterUrl(opts.cluster), "confirmed");
    const keypair = Keypair.fromSecretKey(bs58.decode(opts.privateKey));

    // Compute Anchor discriminator: sha256("global:initialize_app")[0..8]
    const discHash = cryptoModule.createHash("sha256").update("global:initialize_app").digest();
    const disc = discHash.subarray(0, 8);

    // Convert app ID to 32-byte array
    const appIdBytes = Buffer.alloc(32);
    Buffer.from(opts.appId, "utf-8").copy(appIdBytes, 0, 0, Math.min(opts.appId.length, 32));

    // Derive AppRegistry PDA
    const [appRegistryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("app_registry"), appIdBytes],
      PROGRAM_ID
    );

    // Price in USDC (6 decimals)
    const priceUsdc = BigInt(Math.round((opts.priceUsdc || 0) * 1_000_000));
    const developerFeeBps = 8000; // 80%

    // IPFS CID field (64 bytes) — store arweave TX ID or code hash
    const ipfsCid = Buffer.alloc(64);
    const cidContent = opts.arweaveTxId || opts.codeHash || "";
    Buffer.from(cidContent, "utf-8").copy(ipfsCid, 0, 0, Math.min(cidContent.length, 64));

    // Serialize instruction data: disc(8) + app_id(32) + price_usdc(8) + developer_fee_bps(2) + ipfs_cid(64)
    const data = Buffer.alloc(8 + 32 + 8 + 2 + 64);
    disc.copy(data, 0);
    appIdBytes.copy(data, 8);
    data.writeBigUInt64LE(priceUsdc, 40);
    data.writeUInt16LE(developerFeeBps, 48);
    ipfsCid.copy(data, 50);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: appRegistryPda, isSigner: false, isWritable: true },
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data,
    });

    const tx = new Transaction().add(instruction);
    tx.feePayer = keypair.publicKey;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;

    tx.sign(keypair);

    const txId = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "confirmed");

    return { txId };
  } catch (err) {
    console.warn("[publish] On-chain registration failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Register via Keystone API server (non-chain fallback).
 * Supports three auth methods:
 *   1. Bearer token (from keystone register) — stored in config.apiKey
 *   2. Wallet signature — signs a challenge nonce with private key
 *   3. No auth — falls back if neither is available (will likely 401)
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
  },
  auth?: {
    bearerToken?: string;
    privateKey?: string;
  }
): Promise<{ appId: string } | null> {
  try {
    const baseUrl = apiUrl.replace(/\/$/, "");
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    // Auth method 1: Bearer token (from keystone register)
    if (auth?.bearerToken) {
      headers["Authorization"] = `Bearer ${auth.bearerToken}`;
    }
    // Auth method 2: Wallet signature
    else if (auth?.privateKey) {
      try {
        // Fetch challenge nonce
        const nonceRes = await fetch(`${baseUrl}/api/studio/publish/auth`);
        if (nonceRes.ok) {
          const { nonce } = (await nonceRes.json()) as { nonce: string };

          const { Keypair } = await import("@solana/web3.js");
          const bs58 = (await import("bs58")).default;
          const nacl = await import("tweetnacl");

          const keypair = Keypair.fromSecretKey(bs58.decode(auth.privateKey));
          const messageBytes = new TextEncoder().encode(nonce);
          const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

          headers["X-Keystone-Wallet"] = keypair.publicKey.toBase58();
          headers["X-Keystone-Signature"] = bs58.encode(Buffer.from(signature));
          headers["X-Keystone-Nonce"] = nonce;
        }
      } catch (e) {
        console.warn("[publish] Wallet signature auth failed, trying without auth:", (e as Error).message);
      }
    }

    const res = await fetch(`${baseUrl}/api/studio/publish`, {
      method: "POST",
      headers,
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
    console.log("  [4/4] Registering on Solana (Keystone Marketplace program)...");
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
    await registerToRegistry(
      options.apiUrl,
      {
        name: options.name,
        description: options.description,
        code: codeJson,
        creatorWallet: options.creatorWallet,
        arweaveTxId: arweaveTxId ?? undefined,
        codeHash,
        securityScore: gatekeeper.securityScore,
        category: options.category ?? "utility",
      },
      {
        bearerToken: options.bearerToken,
        privateKey: options.privateKey,
      }
    );
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
