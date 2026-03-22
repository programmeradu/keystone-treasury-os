/**
 * POST /api/studio/compile-contract — Compile Solana/Anchor programs.
 *
 * Options:
 * 1. Local Anchor: shells out to `anchor build` (requires Anchor CLI installed)
 * 2. Cloud compile: sends to SolPG-compatible API (no local toolchain needed)
 *
 * Returns compiled artifacts: IDL, .so binary path, and program keypair.
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Use execFile to avoid command injection via shell interpolation
const execFileAsync = promisify(execFile);

interface CompileRequest {
    files: Record<string, string>; // filename -> Rust source code
    programName?: string;
    useCloud?: boolean; // If true, use cloud compiler instead of local Anchor
}

interface CompileResult {
    ok: boolean;
    idl?: any;
    programId?: string;
    artifacts?: {
        idlPath?: string;
        soPath?: string;
        keypairPath?: string;
    };
    warnings?: string[];
    error?: string;
}

/**
 * Local Anchor build — requires `anchor` and `solana` CLI tools installed.
 */
async function compileLocal(
    files: Record<string, string>,
    programName: string
): Promise<CompileResult> {
    // Create a temporary Anchor project
    const tmpDir = path.join(process.cwd(), ".keystone", "contracts", `build_${Date.now()}`);
    const srcDir = path.join(tmpDir, "programs", programName, "src");

    try {
        fs.mkdirSync(srcDir, { recursive: true });

        // Write source files
        for (const [filename, content] of Object.entries(files)) {
            const filePath = path.join(srcDir, filename);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, content, "utf-8");
        }

        // Generate minimal Anchor.toml
        const anchorToml = `[features]
seeds = false
skip-lint = false

[programs.localnet]
${programName} = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
`;
        fs.writeFileSync(path.join(tmpDir, "Anchor.toml"), anchorToml, "utf-8");

        // Generate Cargo.toml for the program
        const cargoToml = `[package]
name = "${programName}"
version = "0.1.0"
description = "Keystone Mini-App Smart Contract"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "${programName.replace(/-/g, "_")}"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
`;
        fs.writeFileSync(
            path.join(tmpDir, "programs", programName, "Cargo.toml"),
            cargoToml,
            "utf-8"
        );

        // Workspace Cargo.toml
        fs.writeFileSync(
            path.join(tmpDir, "Cargo.toml"),
            `[workspace]\nmembers = ["programs/*"]\nresolver = "2"\n`,
            "utf-8"
        );

        // Run anchor build
        const { stdout, stderr } = await execFileAsync("anchor", ["build"], {
            cwd: tmpDir,
            timeout: 120000, // 2 min timeout
        });

        // Read IDL if generated
        const idlPath = path.join(tmpDir, "target", "idl", `${programName.replace(/-/g, "_")}.json`);
        let idl = null;
        if (fs.existsSync(idlPath)) {
            idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
        }

        // Read program keypair
        const keypairPath = path.join(tmpDir, "target", "deploy", `${programName.replace(/-/g, "_")}-keypair.json`);
        let programId: string | undefined;
        if (fs.existsSync(keypairPath)) {
            // Extract public key from keypair
            const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
            // The first 32 bytes are the secret key, next 32 are public key
            // For now, just note the keypair exists
            programId = `Program keypair at: ${keypairPath}`;
        }

        const soPath = path.join(tmpDir, "target", "deploy", `${programName.replace(/-/g, "_")}.so`);

        const warnings: string[] = [];
        if (stderr && !stderr.includes("error")) {
            warnings.push(stderr.trim());
        }

        return {
            ok: true,
            idl,
            programId,
            artifacts: {
                idlPath: fs.existsSync(idlPath) ? idlPath : undefined,
                soPath: fs.existsSync(soPath) ? soPath : undefined,
                keypairPath: fs.existsSync(keypairPath) ? keypairPath : undefined,
            },
            warnings,
        };
    } catch (err: any) {
        // Check if Anchor is installed
        if (err.message?.includes("anchor") && err.message?.includes("not found")) {
            return {
                ok: false,
                error:
                    "Anchor CLI not found. Install it:\n" +
                    "  cargo install --git https://github.com/coral-xyz/anchor anchor-cli\n" +
                    "Or use --use-cloud for cloud compilation.",
            };
        }

        return {
            ok: false,
            error: err.stderr || err.message || "Compilation failed",
        };
    }
}

/**
 * Cloud compilation via Solana Playground-compatible API.
 * Sends source code to a remote builder — no local toolchain needed.
 */
async function compileCloud(
    files: Record<string, string>,
    programName: string
): Promise<CompileResult> {
    const solpgUrl = process.env.SOLPG_API_URL || "https://api.solpg.io";

    try {
        // Format files for SolPG API — expects array of [path, content] tuples
        const sourceFiles = Object.entries(files).map(([name, content]) => [
            `src/${name}`,
            content,
        ]);

        const res = await fetch(`${solpgUrl}/build`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                files: sourceFiles,
                framework: "anchor",
                programName,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Cloud build failed (${res.status}): ${errText.slice(0, 300)}`);
        }

        const result = await res.json();

        return {
            ok: result.success ?? true,
            idl: result.idl,
            programId: result.programId,
            warnings: result.warnings,
            error: result.error,
        };
    } catch (err: any) {
        return {
            ok: false,
            error: `Cloud compilation error: ${err.message}`,
        };
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: CompileRequest = await req.json();
        const { files, programName = "keystone_app", useCloud = false } = body;

        if (!files || Object.keys(files).length === 0) {
            return NextResponse.json(
                { error: "No source files provided" },
                { status: 400 }
            );
        }

        // Ensure at least one .rs file
        const rsFiles = Object.entries(files).filter(([name]) => name.endsWith(".rs"));
        if (rsFiles.length === 0) {
            return NextResponse.json(
                { error: "No Rust (.rs) source files found" },
                { status: 400 }
            );
        }

        let result: CompileResult;

        if (useCloud) {
            result = await compileCloud(files, programName);
        } else {
            result = await compileLocal(files, programName);
        }

        return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    } catch (err) {
        console.error("[compile-contract] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Compilation failed" },
            { status: 500 }
        );
    }
}
