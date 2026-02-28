/**
 * keystone publish — Full pipeline: Gatekeeper → Build → Arweave → Registry.
 * Diamond Merge: Hot path (registry) + Cold path (Arweave).
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
  /** Register on KeystoneMarket (requires apiUrl). Pass price in USDC cents. */
  registerMarketplace?: boolean;
  priceUsdc?: number;
}

export interface PublishResult {
  ok: boolean;
  appId?: string;
  arweaveTxId?: string;
  codeHash?: string;
  securityScore?: number;
  marketplaceRegisterUrl?: string;
  error?: string;
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

async function uploadToArweave(bundlePath: string, manifestPath: string): Promise<string | null> {
  try {
    const Irys = (await import("@irys/sdk")).default;
    const irys = new Irys({ network: "mainnet", token: "solana" });
    const bundle = fs.readFileSync(bundlePath, "utf-8");
    const manifest = fs.readFileSync(manifestPath, "utf-8");
    const data = JSON.stringify({ bundle, manifest });
    const tx = await irys.upload(data);
    return tx?.id ?? null;
  } catch (err) {
    console.warn("[publish] Arweave upload skipped:", err instanceof Error ? err.message : err);
    return null;
  }
}

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

  if (!fs.existsSync(appPath)) {
    return { ok: false, error: "App.tsx not found. Run keystone init first." };
  }

  const code = fs.readFileSync(appPath, "utf-8");
  const codeJson = JSON.stringify({ files: { "App.tsx": { content: code, language: "typescript" } } });

  const gatekeeper = runGatekeeper(targetDir);
  if (!gatekeeper.ok) {
    return {
      ok: false,
      error: `Gatekeeper failed (score: ${gatekeeper.securityScore}). Fix errors:\n${gatekeeper.errors.map((e) => `  ${e.file}:${e.line} — ${e.message}`).join("\n")}`,
      securityScore: gatekeeper.securityScore,
    };
  }

  const build = await runBuild({ dir: targetDir, outDir: path.join(targetDir, ".keystone", "dist") });
  if (!build.ok) {
    return { ok: false, error: build.error };
  }

  const bundlePath = build.outputPath!;
  const manifestPath = path.join(path.dirname(bundlePath), "manifest.json");
  const bundleContent = fs.readFileSync(bundlePath, "utf-8");
  const codeHash = sha256Hex(bundleContent);

  let arweaveTxId: string | null = null;
  if (!options.skipArweave) {
    arweaveTxId = await uploadToArweave(bundlePath, manifestPath);
  }

  let appId: string | undefined;
  if (options.apiUrl) {
    const reg = await registerToRegistry(options.apiUrl, {
      name: options.name,
      description: options.description,
      code: codeJson,
      creatorWallet: options.creatorWallet,
      arweaveTxId: arweaveTxId ?? undefined,
      codeHash,
      securityScore: gatekeeper.securityScore,
      category: options.category ?? "utility",
    });
    appId = reg?.appId;
  }

  const finalAppId = appId ?? `app_${Date.now().toString(36)}`;
  let marketplaceRegisterUrl: string | undefined;
  if (options.registerMarketplace && options.apiUrl && arweaveTxId) {
    marketplaceRegisterUrl = `${options.apiUrl.replace(/\/$/, "")}/api/studio/marketplace/register`;
    try {
      await fetch(marketplaceRegisterUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: finalAppId,
          priceUsdc: options.priceUsdc ?? 0,
          ipfsCid: arweaveTxId,
          developerWallet: options.creatorWallet,
        }),
      });
    } catch {
      // Non-fatal: marketplace registration is optional
    }
  }

  return {
    ok: true,
    appId: finalAppId,
    arweaveTxId: arweaveTxId ?? undefined,
    codeHash,
    securityScore: gatekeeper.securityScore,
    marketplaceRegisterUrl,
  };
}
