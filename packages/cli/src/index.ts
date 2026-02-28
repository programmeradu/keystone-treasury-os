#!/usr/bin/env node

import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { validateLockfile } from "./commands/lockfile.js";
import { runBuild } from "./commands/build.js";
import { runPublish } from "./commands/publish.js";

const program = new Command();

program
  .name("keystone")
  .description("CLI for Keystone Studio Mini-Apps — Sovereign OS 2026")
  .version("0.2.0");

program
  .command("init [dir]")
  .description("Scaffold a new Mini-App")
  .action((dir: string) => {
    try {
      runInit(dir);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("validate [dir]")
  .description("Validate Mini-App against Glass Safety Standard (Ouroboros Loop)")
  .option("--suggest", "Output suggested fixes for each error")
  .action((dir: string = ".", opts: { suggest?: boolean }) => {
    const result = runValidate(dir, { suggest: opts.suggest });
    if (result.ok) {
      const lockResult = validateLockfile(dir);
      if (lockResult.ok) {
        console.log("Validation passed.");
      } else {
        for (const e of lockResult.errors) {
          console.error(`[lockfile] ${e.package}: ${e.message}`);
          if (e.fix) console.error(`  Fix: ${e.fix}`);
        }
        process.exit(1);
      }
    } else {
      for (const e of result.errors) {
        console.error(`${e.file}:${e.line} — ${e.message}`);
        if (opts.suggest && e.suggestion) {
          console.error(`  Suggestion: ${e.suggestion}`);
        }
      }
      process.exit(1);
    }
  });

program
  .command("lockfile [dir]")
  .description("Validate pinned import maps (?external=react,react-dom)")
  .action((dir: string = ".") => {
    const result = validateLockfile(dir);
    if (result.ok) {
      console.log("Lockfile valid.");
    } else {
      for (const e of result.errors) {
        console.error(`${e.package}: ${e.message}`);
        if (e.fix) console.error(`  Fix: ${e.fix}`);
      }
      process.exit(1);
    }
  });

program
  .command("build [dir]")
  .description("Build Mini-App (optional Arweave cold path)")
  .option("--anchor-arweave", "Anchor build to Arweave for atomic rollbacks")
  .option("-o, --out-dir <dir>", "Output directory")
  .action(async (dir: string = ".", opts: { anchorArweave?: boolean; outDir?: string }) => {
    try {
      const result = await runBuild({ dir, anchorArweave: opts.anchorArweave, outDir: opts.outDir });
      if (result.ok) {
        console.log("Build complete:", result.outputPath);
        if (opts.anchorArweave) {
          console.log("Cold path: manifest.json (Arweave upload requires arweave CLI)");
        }
      } else {
        console.error(result.error);
        process.exit(1);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("publish [dir]")
  .description("Publish Mini-App: Gatekeeper → Arweave (Cold) → Registry (Hot)")
  .requiredOption("-n, --name <name>", "App name")
  .requiredOption("-d, --description <desc>", "App description")
  .requiredOption("-w, --wallet <address>", "Creator wallet address")
  .option("--api-url <url>", "Keystone OS API URL (e.g. https://keystone.example.com)")
  .option("-c, --category <cat>", "Category (default: utility)", "utility")
  .option("--skip-arweave", "Skip Arweave cold path upload")
  .option("--register-marketplace", "Register on KeystoneMarket (requires api-url + Arweave)")
  .option("--price-usdc <cents>", "Price in USDC cents for marketplace listing", (v) => parseInt(v, 10))
  .action(async (dir: string = ".", opts: { name: string; description: string; wallet: string; apiUrl?: string; category?: string; skipArweave?: boolean; registerMarketplace?: boolean; priceUsdc?: number }) => {
    try {
      const result = await runPublish({
        dir,
        name: opts.name,
        description: opts.description,
        creatorWallet: opts.wallet,
        apiUrl: opts.apiUrl,
        category: opts.category,
        skipArweave: opts.skipArweave,
        registerMarketplace: opts.registerMarketplace,
        priceUsdc: opts.priceUsdc,
      });
      if (result.ok) {
        console.log("Published:", result.appId);
        if (result.arweaveTxId) console.log("Arweave:", result.arweaveTxId);
        if (result.codeHash) console.log("Code hash:", result.codeHash);
        if (result.securityScore !== undefined) console.log("Security score:", result.securityScore);
        if (result.marketplaceRegisterUrl) console.log("Marketplace register:", result.marketplaceRegisterUrl);
      } else {
        console.error(result.error);
        process.exit(1);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
