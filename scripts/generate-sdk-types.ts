#!/usr/bin/env tsx
/**
 * generate-sdk-types.ts
 *
 * Build-time script that reads the Keystone SDK source-of-truth files
 * (packages/sdk/src/types.ts + packages/sdk/src/hooks/*.ts) and generates
 * a Monaco-compatible `declare module '@keystone-os/sdk' { … }` string.
 *
 * Output: src/generated/keystone-sdk-types.ts
 *
 * This eliminates the manual type duplication in CodeEditor.tsx.
 * Run via: `npm run generate:types` or automatically via `prebuild`.
 *
 * [Phase 1] — SDK Type Codegen Pipeline
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

// ─── Paths ──────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const SDK_SRC = path.join(ROOT, "packages", "sdk", "src");
const TYPES_FILE = path.join(SDK_SRC, "types.ts");
const HOOKS_DIR = path.join(SDK_SRC, "hooks");
const OUTPUT_DIR = path.join(ROOT, "src", "generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "keystone-sdk-types.ts");

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Extract all exported interfaces/types from a TypeScript source file.
 * Returns the raw text of each exported declaration.
 */
function extractExportedDeclarations(filePath: string): string[] {
    const sourceText = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );

    const declarations: string[] = [];

    function visit(node: ts.Node) {
        // Exported interfaces
        if (
            ts.isInterfaceDeclaration(node) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
            declarations.push(node.getText(sourceFile));
        }

        // Exported type aliases
        if (
            ts.isTypeAliasDeclaration(node) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
            declarations.push(node.getText(sourceFile));
        }

        ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return declarations;
}

/**
 * Extract the exported function signature from a hook file.
 * E.g., `export function useVault(): VaultState` → `export function useVault(): VaultState;`
 */
function extractExportedFunctionSignatures(filePath: string): string[] {
    const sourceText = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );

    const signatures: string[] = [];

    function visit(node: ts.Node) {
        if (
            ts.isFunctionDeclaration(node) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
            const name = node.name?.getText(sourceFile) ?? "anonymous";
            const typeParams = node.typeParameters
                ? `<${node.typeParameters.map((tp) => tp.getText(sourceFile)).join(", ")}>`
                : "";
            const params = node.parameters
                .map((p) => {
                    // Strip default values (e.g., `options: FetchOptions = {}` → `options?: FetchOptions`)
                    const text = p.getText(sourceFile);
                    if (p.initializer) {
                        const name = p.name.getText(sourceFile);
                        const type = p.type ? p.type.getText(sourceFile) : "any";
                        return `${name}?: ${type}`;
                    }
                    return text;
                })
                .join(", ");
            const returnType = node.type
                ? node.type.getText(sourceFile)
                : "void";
            signatures.push(`  export function ${name}${typeParams}(${params}): ${returnType};`);
        }

        // Also capture exported const (e.g., AppEventBus)
        if (
            ts.isVariableStatement(node) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
            for (const decl of node.declarationList.declarations) {
                const name = decl.name.getText(sourceFile);
                const type = decl.type ? decl.type.getText(sourceFile) : "any";
                signatures.push(`  export const ${name}: ${type};`);
            }
        }

        ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return signatures;
}

/**
 * Extract exported interfaces from a hook file (interfaces defined inside hooks,
 * e.g., UseJupiterSwapResult, JupiterQuote, etc.)
 */
function extractHookInterfaces(filePath: string): string[] {
    const sourceText = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(
        path.basename(filePath),
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );

    const interfaces: string[] = [];

    function visit(node: ts.Node) {
        if (
            ts.isInterfaceDeclaration(node) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
            // Re-indent for the declare module block
            const text = node.getText(sourceFile);
            interfaces.push(`  export ${text.replace(/^export\s+/, "")}`);
        }

        ts.forEachChild(node, visit);
    }

    ts.forEachChild(sourceFile, visit);
    return interfaces;
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
    console.log("🔧 Generating SDK type definitions for Monaco…\n");

    // 1. Read types.ts — extract all exported interfaces/types
    if (!fs.existsSync(TYPES_FILE)) {
        console.error(`❌ types.ts not found at: ${TYPES_FILE}`);
        process.exit(1);
    }

    const coreDeclarations = extractExportedDeclarations(TYPES_FILE);
    console.log(`  📄 types.ts: ${coreDeclarations.length} declarations`);

    // 2. Read each hook file
    const hookFiles = fs
        .readdirSync(HOOKS_DIR)
        .filter((f) => f.endsWith(".ts") && f !== "index.ts")
        .sort();

    const hookInterfaces: string[] = [];
    const hookSignatures: string[] = [];
    const hookNames: string[] = [];

    for (const hookFile of hookFiles) {
        const filePath = path.join(HOOKS_DIR, hookFile);

        const interfaces = extractHookInterfaces(filePath);
        hookInterfaces.push(...interfaces);

        const sigs = extractExportedFunctionSignatures(filePath);
        hookSignatures.push(...sigs);

        console.log(
            `  🪝 ${hookFile}: ${interfaces.length} interfaces, ${sigs.length} exports`
        );

        // Track the primary export name for the backward-compat alias
        const baseName = hookFile.replace(".ts", "");
        hookNames.push(baseName);
    }

    // 3. Build the `declare module '@keystone-os/sdk'` string
    const coreTypesBlock = coreDeclarations
        .map((d) => {
            // Strip the `export` keyword and re-indent inside declare module
            const cleaned = d.replace(/^export\s+/, "");
            return `  export ${cleaned}`;
        })
        .join("\n\n");

    const hookInterfacesBlock = hookInterfaces.join("\n\n");
    const hookSignaturesBlock = hookSignatures.join("\n");

    // Build the list of hook names for the backward-compat alias
    const allExportNames = hookNames.map((n) => {
        // Convert filename to export name: AppEventBus stays as-is, others are the function name
        return n;
    });

    const backwardCompatExports = allExportNames
        .map((n) => `    ${n},`)
        .join("\n");

    const moduleDeclaration = `\
declare module '@keystone-os/sdk' {
  // ─── Core Types (from packages/sdk/src/types.ts) ───────────────

${coreTypesBlock}

  // ─── Hook Interfaces (from packages/sdk/src/hooks/*.ts) ────────

${hookInterfacesBlock}

  // ─── Hook Exports ──────────────────────────────────────────────

${hookSignaturesBlock}
}

// Backward-compat alias
declare module './keystone' {
  export {
${backwardCompatExports}
  } from '@keystone-os/sdk';
}
`;

    // 4. Emit the output file
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const outputContent = `\
/**
 * AUTO-GENERATED — DO NOT EDIT MANUALLY
 *
 * Generated by: scripts/generate-sdk-types.ts
 * Source:       packages/sdk/src/types.ts + packages/sdk/src/hooks/*.ts
 * Generated:   ${new Date().toISOString()}
 *
 * This file provides Monaco-compatible type definitions for @keystone-os/sdk.
 * It is consumed by CodeEditor.tsx to give developers full autocomplete,
 * type checking, and tooltip documentation in Keystone Studio.
 *
 * To regenerate: npm run generate:types
 */

export const KEYSTONE_SDK_TYPES = \`
${moduleDeclaration}\`;
`;

    fs.writeFileSync(OUTPUT_FILE, outputContent, "utf-8");
    console.log(`\n✅ Generated: ${path.relative(ROOT, OUTPUT_FILE)}`);
    console.log(
        `   ${coreDeclarations.length} core types + ${hookInterfaces.length} hook interfaces + ${hookSignatures.length} hook exports`
    );
}

main();
