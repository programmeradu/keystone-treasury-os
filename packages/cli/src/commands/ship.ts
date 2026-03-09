/**
 * keystone ship — One command to validate, build, and publish.
 *
 * Reads keystone.config.json for defaults. No flags needed if config exists.
 * This is THE developer command — from code to marketplace in one step.
 */

import * as path from "node:path";
import * as fs from "node:fs";
import { loadConfig, mergeConfig, type KeystoneConfig } from "./config.js";
import { runGatekeeper } from "./gatekeeper.js";
import { runBuild } from "./build.js";
import { runPublish } from "./publish.js";

export interface ShipOptions {
    dir?: string;
    name?: string;
    description?: string;
    wallet?: string;
    privateKey?: string;
    cluster?: string;
    skipArweave?: boolean;
    yes?: boolean;
    apiUrl?: string;
}

export interface ShipResult {
    ok: boolean;
    appId?: string;
    arweaveTxId?: string;
    solanaTxId?: string;
    explorerUrl?: string;
    securityScore?: number;
    codeHash?: string;
    error?: string;
}

export async function runShip(options: ShipOptions): Promise<ShipResult> {
    const dir = path.resolve(process.cwd(), options.dir || ".");
    const appPath = path.join(dir, "App.tsx");

    if (!fs.existsSync(appPath)) {
        return { ok: false, error: "No App.tsx found. Run `keystone init` to get started." };
    }

    // Load config and merge with CLI flags
    const config = loadConfig(dir);
    const merged = mergeConfig(config, {
        name: options.name,
        description: options.description,
        wallet: options.wallet,
        privateKey: options.privateKey,
        cluster: options.cluster as any,
    });

    // Validate required fields
    const appName = merged.name || path.basename(dir);
    const description = merged.description || `Built with Keystone CLI`;
    const wallet = merged.wallet;

    if (!wallet) {
        return {
            ok: false,
            error: [
                "No wallet address found.",
                "",
                "Set it in keystone.config.json:",
                '  { "wallet": "YOUR_WALLET_ADDRESS" }',
                "",
                "Or pass it as a flag:",
                "  keystone ship --wallet YOUR_WALLET_ADDRESS",
            ].join("\n"),
        };
    }

    console.log(`\n  Shipping "${appName}" to Keystone Marketplace\n`);

    // Step 1: Validate
    console.log("  [1/4] Running security gatekeeper...");
    const gatekeeper = runGatekeeper(dir);
    if (!gatekeeper.ok) {
        return {
            ok: false,
            securityScore: gatekeeper.securityScore,
            error: `Security check failed (${gatekeeper.securityScore}/100):\n${gatekeeper.errors.map((e) => `    ${e.file}:${e.line} — ${e.message}`).join("\n")}`,
        };
    }
    console.log(`         Score: ${gatekeeper.securityScore}/100`);

    // Step 2: Build
    console.log("  [2/4] Building bundle...");
    const build = await runBuild({ dir, outDir: path.join(dir, ".keystone", "dist") });
    if (!build.ok) {
        return { ok: false, error: `Build failed: ${build.error}` };
    }
    console.log(`         Output: ${path.basename(build.outputPath!)}`);

    // Step 3 & 4: Publish (handles Arweave + Solana)
    const publishResult = await runPublish({
        dir,
        name: appName,
        description,
        creatorWallet: wallet,
        privateKey: merged.privateKey || options.privateKey,
        bearerToken: merged.apiKey,
        cluster: (merged.cluster || options.cluster || "devnet") as any,
        skipArweave: options.skipArweave,
        apiUrl: options.apiUrl || merged.apiUrl,
        category: merged.category,
    });

    if (!publishResult.ok) {
        return { ok: false, error: publishResult.error };
    }

    return {
        ok: true,
        appId: publishResult.appId,
        arweaveTxId: publishResult.arweaveTxId,
        solanaTxId: publishResult.solanaTxId,
        explorerUrl: publishResult.explorerUrl,
        securityScore: gatekeeper.securityScore,
        codeHash: publishResult.codeHash,
    };
}
