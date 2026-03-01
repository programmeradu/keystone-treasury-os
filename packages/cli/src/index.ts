#!/usr/bin/env node

import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runValidate } from "./commands/validate.js";
import { validateLockfile } from "./commands/lockfile.js";
import { runBuild } from "./commands/build.js";
import { runPublish } from "./commands/publish.js";
import { runDev } from "./commands/dev.js";
import { runGenerate } from "./commands/generate.js";
import { runDeploy } from "./commands/deploy.js";
import { runShip } from "./commands/ship.js";
import { loadConfig, saveConfig } from "./commands/config.js";

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
  .command("dev [dir]")
  .description("Start local dev server with Keystone SDK sandbox")
  .option("-p, --port <port>", "Port number (default: 4200)", (v) => parseInt(v, 10))
  .action((dir: string = ".", opts: { port?: number }) => {
    try {
      runDev({ dir, port: opts.port });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("generate")
  .description("AI-generate a Mini-App from a natural language prompt")
  .requiredOption("-p, --prompt <prompt>", "What to build (e.g. 'Build a Jupiter swap widget')")
  .option("--provider <provider>", "LLM provider: groq, cloudflare, openai, ollama")
  .option("--api-key <key>", "API key (or accountId:token for Cloudflare)")
  .option("--model <model>", "Model override (default: auto per provider)")
  .option("--api-url <url>", "Use a running Keystone server instead of direct LLM")
  .option("-f, --force", "Overwrite existing App.tsx")
  .option("-d, --dir <dir>", "Target directory (default: current)", ".")
  .action(async (opts: { prompt: string; provider?: string; apiKey?: string; model?: string; apiUrl?: string; force?: boolean; dir?: string }) => {
    try {
      console.log("\nKeystone Architect -- Generating Mini-App...\n");
      const result = await runGenerate({
        prompt: opts.prompt,
        dir: opts.dir,
        provider: opts.provider as any,
        apiKey: opts.apiKey,
        model: opts.model,
        apiUrl: opts.apiUrl,
        force: opts.force,
      });
      if (result.ok) {
        console.log("Generated files:");
        for (const name of Object.keys(result.files || {})) {
          console.log(`  + ${name}`);
        }
        if (result.explanation) {
          console.log(`\n${result.explanation}`);
        }
        console.log(`\nProvider: ${result.provider}`);
        console.log("\nNext steps:");
        console.log("  keystone validate   # Check safety");
        console.log("  keystone dev        # Preview locally");
        console.log("  keystone publish    # Deploy to marketplace\n");
      } else {
        console.error(`\nGeneration failed: ${result.error}`);
        process.exit(1);
      }
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
  .description("Publish Mini-App: Gatekeeper → Arweave → On-Chain Registry")
  .requiredOption("-n, --name <name>", "App name")
  .requiredOption("-d, --description <desc>", "App description")
  .requiredOption("-w, --wallet <address>", "Creator wallet address")
  .option("--private-key <key>", "Base58 private key for signing (Arweave + Solana)")
  .option("--cluster <cluster>", "Solana cluster: devnet or mainnet-beta", "devnet")
  .option("--api-url <url>", "Keystone OS API URL (e.g. https://keystone.example.com)")
  .option("-c, --category <cat>", "Category (default: utility)", "utility")
  .option("--skip-arweave", "Skip Arweave cold path upload")
  .option("--register-marketplace", "Register on KeystoneMarket")
  .option("--price-usdc <cents>", "Price in USDC cents", (v) => parseInt(v, 10))
  .action(async (dir: string = ".", opts: { name: string; description: string; wallet: string; privateKey?: string; cluster?: string; apiUrl?: string; category?: string; skipArweave?: boolean; registerMarketplace?: boolean; priceUsdc?: number }) => {
    try {
      const result = await runPublish({
        dir,
        name: opts.name,
        description: opts.description,
        creatorWallet: opts.wallet,
        privateKey: opts.privateKey,
        cluster: opts.cluster as any,
        apiUrl: opts.apiUrl,
        category: opts.category,
        skipArweave: opts.skipArweave,
        registerMarketplace: opts.registerMarketplace,
        priceUsdc: opts.priceUsdc,
      });
      if (result.ok) {
        console.log("\nPublished to Keystone OS!");
        console.log(`\n  App ID: ${result.appId}`);
        if (result.arweaveTxId) console.log(`  Arweave: https://arweave.net/${result.arweaveTxId}`);
        if (result.codeHash) console.log(`  Hash: ${result.codeHash}`);
        if (result.securityScore !== undefined) console.log(`  Security: ${result.securityScore}/100`);
        if (result.solanaTxId) console.log(`  Solana TX: ${result.solanaTxId}`);
        if (result.explorerUrl) console.log(`  Explorer: ${result.explorerUrl}`);
        console.log("\n");
      } else {
        console.error(`\nPublish Failed:`);
        console.error(result.error);
        process.exit(1);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("deploy [dir]")
  .description("Deploy compiled Solana program to devnet/mainnet")
  .option("--cluster <cluster>", "Target cluster: devnet, mainnet-beta, testnet, localnet", "devnet")
  .option("--program-name <name>", "Program name (default: keystone_app)", "keystone_app")
  .option("--keypair <path>", "Deployer keypair path")
  .option("--program-keypair <path>", "Program keypair for deterministic address")
  .option("--so-path <path>", "Path to compiled .so file")
  .option("--skip-idl", "Skip IDL upload")
  .action(async (dir: string = ".", opts: { cluster?: string; programName?: string; keypair?: string; programKeypair?: string; soPath?: string; skipIdl?: boolean }) => {
    try {
      console.log(`\nDeploying to ${opts.cluster || "devnet"}...\n`);
      const result = await runDeploy({
        dir,
        cluster: opts.cluster as any,
        programName: opts.programName,
        keypair: opts.keypair,
        programKeypair: opts.programKeypair,
        soPath: opts.soPath,
        skipIdl: opts.skipIdl,
      });
      if (result.ok) {
        console.log("\nDeployment successful!");
        console.log(`  Program ID: ${result.programId}`);
        console.log(`  Cluster: ${result.cluster}`);
        if (result.txSignature) console.log(`  Tx: ${result.txSignature}`);
        if (result.idlUploaded) console.log("  IDL: Uploaded");
        console.log(`\n  Explorer: https://explorer.solana.com/address/${result.programId}?cluster=${result.cluster}\n`);
      } else {
        console.error(`\nDeploy failed: ${result.error}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ─── Ship (One-Command Publish) ──────────────────────────────────────
program
  .command("ship [dir]")
  .description("Ship mini-app to marketplace (validate + build + publish in one step)")
  .option("-n, --name <name>", "App name (overrides config)")
  .option("-d, --description <desc>", "App description (overrides config)")
  .option("-w, --wallet <address>", "Creator wallet (overrides config)")
  .option("--private-key <key>", "Base58 private key for signing")
  .option("--cluster <cluster>", "Solana cluster: devnet or mainnet-beta")
  .option("--skip-arweave", "Skip Arweave upload")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (dir: string = ".", opts: { name?: string; description?: string; wallet?: string; privateKey?: string; cluster?: string; skipArweave?: boolean; yes?: boolean }) => {
    try {
      const result = await runShip({ dir, ...opts });
      if (result.ok) {
        console.log("\n  Shipped to Keystone Marketplace!");
        console.log(`\n  App ID:   ${result.appId}`);
        if (result.arweaveTxId) console.log(`  Arweave:  https://arweave.net/${result.arweaveTxId}`);
        if (result.codeHash) console.log(`  Hash:     ${result.codeHash}`);
        if (result.securityScore !== undefined) console.log(`  Security: ${result.securityScore}/100`);
        if (result.solanaTxId) console.log(`  Solana:   ${result.solanaTxId}`);
        if (result.explorerUrl) console.log(`  Explorer: ${result.explorerUrl}`);
        console.log("\n");
      } else {
        console.error(`\n  Ship failed:\n  ${result.error}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ─── Config ──────────────────────────────────────────────────────────
program
  .command("config [dir]")
  .description("Create or edit keystone.config.json")
  .option("-n, --name <name>", "Set app name")
  .option("-w, --wallet <address>", "Set wallet address")
  .option("--cluster <cluster>", "Set cluster")
  .option("--provider <provider>", "Set AI provider")
  .option("--show", "Display current config")
  .action((dir: string = ".", opts: { name?: string; wallet?: string; cluster?: string; provider?: string; show?: boolean }) => {
    const config = loadConfig(dir);
    if (opts.show) {
      console.log("\n  keystone.config.json:\n");
      console.log(JSON.stringify(config, null, 2));
      console.log("");
      return;
    }
    if (opts.name) config.name = opts.name;
    if (opts.wallet) config.wallet = opts.wallet;
    if (opts.cluster) config.cluster = opts.cluster as any;
    if (opts.provider) config.provider = opts.provider;
    saveConfig(config, dir);
    console.log("\n  Config saved to keystone.config.json\n");
  });

// ─── Status ──────────────────────────────────────────────────────────
program
  .command("status [dir]")
  .description("Show project info and publish state")
  .action((dir: string = ".") => {
    const config = loadConfig(dir);
    const path = require("node:path");
    const fs = require("node:fs");
    const targetDir = path.resolve(process.cwd(), dir);
    const hasApp = fs.existsSync(path.join(targetDir, "App.tsx"));
    const hasBundle = fs.existsSync(path.join(targetDir, ".keystone", "dist", "app.bundle.js"));
    const hasLock = fs.existsSync(path.join(targetDir, "keystone.lock.json"));

    console.log("\n  Keystone Project Status\n");
    console.log(`  Name:      ${config.name || "(not set)"}`);
    console.log(`  Wallet:    ${config.wallet || "(not set)"}`);
    console.log(`  Cluster:   ${config.cluster || "devnet"}`);
    console.log(`  Category:  ${config.category || "utility"}`);
    console.log(`  Provider:  ${config.provider || "(not set)"}`);
    console.log("");
    console.log(`  App.tsx:   ${hasApp ? "Found" : "Missing (run keystone init)"}`);
    console.log(`  Bundle:    ${hasBundle ? "Built" : "Not built (run keystone build)"}`);
    console.log(`  Lockfile:  ${hasLock ? "Valid" : "Missing"}`);
    console.log("");
  });

program.parse();
