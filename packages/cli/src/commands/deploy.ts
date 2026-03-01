/**
 * keystone deploy — Deploy compiled Solana programs to devnet/mainnet.
 *
 * Handles:
 * 1. Program deployment via `solana program deploy`
 * 2. IDL upload via `anchor idl init`
 * 3. Verification output
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface DeployOptions {
    dir?: string;
    cluster?: "devnet" | "mainnet-beta" | "testnet" | "localnet";
    programName?: string;
    keypair?: string; // Path to deployer keypair
    programKeypair?: string; // Path to program keypair (for deterministic address)
    skipIdl?: boolean;
    /** Use pre-compiled .so from build step */
    soPath?: string;
}

export interface DeployResult {
    ok: boolean;
    programId?: string;
    cluster?: string;
    txSignature?: string;
    idlUploaded?: boolean;
    error?: string;
}

export async function runDeploy(options: DeployOptions): Promise<DeployResult> {
    const targetDir = path.resolve(process.cwd(), options.dir ?? ".");
    const cluster = options.cluster ?? "devnet";
    const programName = options.programName ?? "keystone_app";

    // Verify solana CLI is available
    try {
        await execAsync("solana --version");
    } catch {
        return {
            ok: false,
            error:
                "Solana CLI not found. Install it:\n" +
                "  sh -c \"$(curl -sSfL https://release.anza.xyz/stable/install)\"\n" +
                "  export PATH=\"~/.local/share/solana/install/active_release/bin:$PATH\"",
        };
    }

    // Find the compiled .so file
    const soPath =
        options.soPath ||
        path.join(targetDir, ".keystone", "dist", `${programName}.so`) ||
        path.join(targetDir, "target", "deploy", `${programName}.so`);

    if (!fs.existsSync(soPath)) {
        return {
            ok: false,
            error: `Compiled program not found at: ${soPath}\n  Run 'keystone build' first, or provide --so-path.`,
        };
    }

    // Set cluster
    try {
        await execAsync(`solana config set --url ${getClusterUrl(cluster)}`);
    } catch (err: any) {
        return { ok: false, error: `Failed to set cluster: ${err.message}` };
    }

    // Check deployer balance
    try {
        const { stdout } = await execAsync("solana balance");
        const balance = parseFloat(stdout.trim().split(" ")[0]);
        if (balance < 0.5 && cluster !== "localnet") {
            console.warn(
                `Warning: Low deployer balance (${balance} SOL). Deploy may fail.\n` +
                (cluster === "devnet" ? "  Run: solana airdrop 2" : "  Fund your wallet before deploying.")
            );
        }
    } catch {
        // Non-fatal
    }

    // Deploy program
    try {
        let deployCmd = `solana program deploy "${soPath}"`;

        // Use custom program keypair if provided (deterministic address)
        if (options.programKeypair) {
            deployCmd += ` --program-id "${options.programKeypair}"`;
        }

        // Use custom deployer keypair
        if (options.keypair) {
            deployCmd += ` --keypair "${options.keypair}"`;
        }

        console.log(`Deploying to ${cluster}...`);
        const { stdout, stderr } = await execAsync(deployCmd, {
            cwd: targetDir,
            timeout: 180000, // 3 min timeout
        });

        // Extract program ID from output
        const programIdMatch = stdout.match(/Program Id:\s*(\w+)/);
        const programId = programIdMatch?.[1];

        if (!programId) {
            return {
                ok: false,
                error: `Deploy succeeded but could not parse program ID:\n${stdout}`,
            };
        }

        // Upload IDL if available and not skipped
        let idlUploaded = false;
        if (!options.skipIdl) {
            const idlPath = path.join(
                targetDir,
                "target",
                "idl",
                `${programName}.json`
            );
            if (fs.existsSync(idlPath)) {
                try {
                    await execAsync(
                        `anchor idl init --filepath "${idlPath}" ${programId}`,
                        { cwd: targetDir, timeout: 60000 }
                    );
                    idlUploaded = true;
                } catch (idlErr: any) {
                    console.warn(`IDL upload skipped: ${idlErr.message}`);
                }
            }
        }

        // Extract tx signature if present
        const txMatch = stdout.match(/Signature:\s*(\w+)/);

        return {
            ok: true,
            programId,
            cluster,
            txSignature: txMatch?.[1],
            idlUploaded,
        };
    } catch (err: any) {
        return {
            ok: false,
            error: err.stderr || err.message || "Deployment failed",
            cluster,
        };
    }
}

function getClusterUrl(cluster: string): string {
    switch (cluster) {
        case "mainnet-beta":
            return "https://api.mainnet-beta.solana.com";
        case "devnet":
            return "https://api.devnet.solana.com";
        case "testnet":
            return "https://api.testnet.solana.com";
        case "localnet":
            return "http://localhost:8899";
        default:
            return "https://api.devnet.solana.com";
    }
}
