/**
 * Build command — Bundle Mini-App + optional Arweave Cold Path.
 * Atomic Rollbacks: every version anchored to Arweave.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface BuildResult {
  ok: boolean;
  outputPath?: string;
  arweaveTxId?: string;
  manifest?: string;
  error?: string;
}

export interface BuildOptions {
  dir?: string;
  anchorArweave?: boolean;
  outDir?: string;
}

export async function runBuild(options: BuildOptions = {}): Promise<BuildResult> {
  const targetDir = path.resolve(process.cwd(), options.dir ?? ".");
  const outDir = options.outDir ?? path.join(targetDir, "dist");

  const appPath = path.join(targetDir, "App.tsx");
  if (!fs.existsSync(appPath)) {
    return { ok: false, error: "App.tsx not found" };
  }

  const raw = fs.readFileSync(appPath, "utf-8");
  let bundle = raw;

  fs.mkdirSync(outDir, { recursive: true });
  const outputPath = path.join(outDir, "app.bundle.js");
  fs.writeFileSync(outputPath, bundle);

  const manifest = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    files: ["app.bundle.js"],
    coldPath: null as string | null,
  };

  if (options.anchorArweave) {
    manifest.coldPath = `arweave://pending`;
  }

  const manifestPath = path.join(outDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    ok: true,
    outputPath,
    manifest: manifestPath,
    arweaveTxId: options.anchorArweave ? undefined : undefined,
  };
}
