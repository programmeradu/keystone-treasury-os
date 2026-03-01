/**
 * Keystone Framework Specification — Single Source of Truth.
 *
 * Defines what is VALID in the Keystone Mini-App ecosystem:
 * - All 16 SDK exports with full signatures
 * - Import allowlist (only these modules exist in the sandbox)
 * - Blocked imports with SDK alternatives
 * - Blocked API patterns
 *
 * Consumed by:
 * 1. System prompt builder (route.ts) — injected into every AI call
 * 2. Post-generation validator (architect-engine.ts) — self-correction gate
 * 3. CLI validate command (packages/cli)
 *
 * [AI Architect Guardrails]
 */

// ─── SDK Exports ────────────────────────────────────────────────────
// These are the ONLY named exports available from '@keystone-os/sdk'

export const SDK_EXPORTS: Record<string, {
    type: "hook" | "object";
    signature: string;
    returns: string;
    description: string;
}> = {
    useVault: {
        type: "hook",
        signature: "useVault()",
        returns: "{ activeVault: string, balances: Record<string,number>, tokens: Token[] }",
        description: "Access vault balances and token list",
    },
    useTurnkey: {
        type: "hook",
        signature: "useTurnkey()",
        returns: "{ getPublicKey: () => Promise<string>, signTransaction: (tx: any, description?: string) => Promise<{ signature: string }> }",
        description: "Institutional-grade wallet signing via Turnkey",
    },
    useFetch: {
        type: "hook",
        signature: "useFetch<T>(url: string, options?: FetchOptions)",
        returns: "{ data: T|null, error: string|null, loading: boolean, refetch: () => void }",
        description: "Proxied HTTP requests through Keystone security gateway",
    },
    AppEventBus: {
        type: "object",
        signature: "AppEventBus",
        returns: "{ emit: (type: string, payload?: any) => void }",
        description: "Emit events to the host application",
    },
    useEncryptedSecret: {
        type: "hook",
        signature: "useEncryptedSecret()",
        returns: "{ encrypt: (plaintext: string, keyId?: string) => Promise<string>, decrypt: (ciphertext: string, keyId?: string) => Promise<string>, loading: boolean, error: string|null }",
        description: "Encrypt/decrypt secrets via Lit Protocol",
    },
    useACEReport: {
        type: "hook",
        signature: "useACEReport(options?: { since?: Date })",
        returns: "{ report: ACEEntry[], loading: boolean, error: string|null, refetch: () => Promise<void> }",
        description: "Access Control Engine audit report",
    },
    useAgentHandoff: {
        type: "hook",
        signature: "useAgentHandoff(fromAgent: string)",
        returns: "{ handoffTo: (toAgent: string, context?: Record<string,any>) => Promise<{ status: string }> }",
        description: "Hand off execution context to another AI agent",
    },
    useMCPClient: {
        type: "hook",
        signature: "useMCPClient(serverUrl: string)",
        returns: "{ call: (tool: string, params?: Record<string,any>) => Promise<any>, loading: boolean, error: string|null }",
        description: "Call tools on a Model Context Protocol server",
    },
    useMCPServer: {
        type: "hook",
        signature: "useMCPServer(tools: MCPToolSpec[], handlers: Record<string, Function>)",
        returns: "{ registerTools: () => void, handleCall: (tool: string, params: any) => Promise<any> }",
        description: "Expose tools as an MCP server",
    },
    useSIWS: {
        type: "hook",
        signature: "useSIWS()",
        returns: "{ signIn: () => Promise<{ message, signature, address, chainId }>, verify: (sig: string) => Promise<boolean>, session: SIWSSession|null }",
        description: "Sign-In With Solana authentication",
    },
    useJupiterSwap: {
        type: "hook",
        signature: "useJupiterSwap()",
        returns: "{ swap: (params: JupiterSwapParams) => Promise<SwapResult>, getQuote: (params: JupiterSwapParams) => Promise<QuoteResult>, loading: boolean, error: string|null }",
        description: "Deep-routed token swaps via Jupiter aggregator",
    },
    useImpactReport: {
        type: "hook",
        signature: "useImpactReport()",
        returns: "{ simulate: (tx: any) => Promise<ImpactReport>, report: ImpactReport|null, loading: boolean, error: string|null }",
        description: "Pre-flight transaction simulation with before/after diff",
    },
    useTaxForensics: {
        type: "hook",
        signature: "useTaxForensics(options?: { since?: Date })",
        returns: "{ result: TaxForensicsResult|null, loading: boolean, error: string|null, refetch: () => Promise<void> }",
        description: "Tax lot analysis — cost basis, realized/unrealized gains",
    },
    useYieldOptimizer: {
        type: "hook",
        signature: "useYieldOptimizer(asset: string)",
        returns: "{ paths: YieldPath[], loading: boolean, error: string|null, refetch: () => Promise<void> }",
        description: "Discover optimal yield paths across DeFi protocols",
    },
    useGaslessTx: {
        type: "hook",
        signature: "useGaslessTx()",
        returns: "{ submit: (tx: any, description?: string) => Promise<{ signature: string }>, loading: boolean, error: string|null }",
        description: "Submit transactions without SOL for gas (fee payer relay)",
    },
};

// Convenience: set of all valid SDK export names
export const VALID_SDK_EXPORTS = new Set(Object.keys(SDK_EXPORTS));

// ─── Import Allowlist ───────────────────────────────────────────────
// ONLY these module specifiers are valid in the sandbox

export const IMPORT_ALLOWLIST = new Set([
    "@keystone-os/sdk",
    "react",
    "react-dom",
    "react-dom/client",
    "react/jsx-runtime",
]);

// ─── Blocked Imports ────────────────────────────────────────────────
// Common imports that developers might try but WILL FAIL

export const BLOCKED_IMPORTS: {
    pattern: RegExp;
    library: string;
    reason: string;
    alternative: string;
}[] = [
        { pattern: /\baxios\b/, library: "axios", reason: "Not available in sandbox", alternative: "useFetch() from '@keystone-os/sdk'" },
        { pattern: /\b@solana\/web3\.js\b/, library: "@solana/web3.js", reason: "Use SDK hooks instead of raw Solana", alternative: "useTurnkey() for signing, useVault() for balances" },
        { pattern: /\b@solana\/spl-token\b/, library: "@solana/spl-token", reason: "Token operations handled by SDK", alternative: "useVault() for tokens, useJupiterSwap() for swaps" },
        { pattern: /\bethers\b/, library: "ethers", reason: "Ethereum library — Keystone is Solana-native", alternative: "useTurnkey() for signing operations" },
        { pattern: /\bweb3\b/, library: "web3", reason: "Not available in sandbox", alternative: "Use '@keystone-os/sdk' hooks" },
        { pattern: /\b@metaplex-foundation\b/, library: "@metaplex-foundation", reason: "Not available in sandbox", alternative: "useFetch() to call Metaplex APIs" },
        { pattern: /\bnext\b/, library: "next", reason: "Next.js server APIs unavailable in iframe", alternative: "This is a client-side Mini-App, not a Next.js app" },
        { pattern: /\bnode:/, library: "node:*", reason: "Node.js built-ins unavailable", alternative: "Use SDK hooks for I/O operations" },
        { pattern: /\b@tanstack\/react-query\b/, library: "@tanstack/react-query", reason: "Not bundled in sandbox", alternative: "useFetch() handles caching and loading states" },
        { pattern: /\b@chakra-ui\b/, library: "@chakra-ui", reason: "Not available; Tailwind CSS is loaded", alternative: "Use Tailwind CSS classes (loaded via CDN)" },
        { pattern: /\b@mui\/material\b/, library: "@mui/material", reason: "Not available in sandbox", alternative: "Use Tailwind CSS classes" },
        { pattern: /\bzustand\b/, library: "zustand", reason: "Not bundled in sandbox", alternative: "Use React useState/useReducer" },
        { pattern: /\bjotai\b/, library: "jotai", reason: "Not bundled in sandbox", alternative: "Use React useState/useContext" },
        { pattern: /\brecoil\b/, library: "recoil", reason: "Not bundled in sandbox", alternative: "Use React useState/useContext" },
        { pattern: /\bswr\b/, library: "swr", reason: "Not bundled in sandbox", alternative: "useFetch() from '@keystone-os/sdk'" },
        { pattern: /\b@anchor-lang\b/, library: "@project-serum/anchor", reason: "Not available in sandbox", alternative: "useTurnkey() for wallet, useFetch() for RPC" },
    ];

// ─── Blocked APIs ───────────────────────────────────────────────────

export const BLOCKED_APIS: {
    pattern: RegExp;
    api: string;
    reason: string;
    alternative: string;
}[] = [
        { pattern: /\bfetch\s*\(/, api: "fetch()", reason: "Blocked by CSP", alternative: "useFetch(url) from '@keystone-os/sdk'" },
        { pattern: /\blocalStorage\b/, api: "localStorage", reason: "Blocked by sandbox (no allow-same-origin)", alternative: "useEncryptedSecret() for persistent data" },
        { pattern: /\bsessionStorage\b/, api: "sessionStorage", reason: "Blocked by sandbox", alternative: "React useState for session state" },
        { pattern: /\bdocument\.cookie\b/, api: "document.cookie", reason: "Blocked by sandbox", alternative: "useSIWS() for authentication" },
        { pattern: /\bwindow\.parent\.postMessage\b/, api: "postMessage", reason: "Reserved for SDK bridge", alternative: "AppEventBus.emit() for host communication" },
        { pattern: /\beval\s*\(/, api: "eval()", reason: "Blocked by CSP", alternative: "No alternative — dynamic code execution is not allowed" },
        { pattern: /\bnew\s+Function\s*\(/, api: "new Function()", reason: "Blocked by CSP", alternative: "No alternative — dynamic code execution is not allowed" },
        { pattern: /\brequire\s*\(/, api: "require()", reason: "CommonJS not available", alternative: "Use ESM imports: import { ... } from '...'" },
        { pattern: /\b__dirname\b/, api: "__dirname", reason: "Node.js global", alternative: "Not applicable in browser runtime" },
        { pattern: /\bprocess\.env\b/, api: "process.env", reason: "Node.js global", alternative: "Use useEncryptedSecret() for secrets" },
        { pattern: /\bwindow\.open\s*\(/, api: "window.open()", reason: "Blocked by sandbox", alternative: "Use anchor tags with target='_blank'" },
        { pattern: /\bnew\s+XMLHttpRequest\b/, api: "XMLHttpRequest", reason: "Blocked — use SDK", alternative: "useFetch() from '@keystone-os/sdk'" },
        { pattern: /\bnew\s+WebSocket\b/, api: "WebSocket", reason: "Not proxied", alternative: "useMCPClient() for real-time communication" },
    ];

// ─── System Prompt Generator ────────────────────────────────────────

/**
 * Generates the complete SDK reference section for the AI system prompt.
 * This is auto-generated from SDK_EXPORTS to stay in sync.
 */
export function generateSDKPromptSection(): string {
    const lines: string[] = [
        `═══════════════════════════════════════════════════════════════`,
        `§3. KEYSTONE SDK — COMPLETE REFERENCE (@keystone-os/sdk)`,
        `═══════════════════════════════════════════════════════════════`,
        ``,
        `ALWAYS import from '@keystone-os/sdk'. This is the ONLY module with SDK hooks.`,
        ``,
        `Available exports (${Object.keys(SDK_EXPORTS).length} total):`,
        ``,
    ];

    for (const [name, spec] of Object.entries(SDK_EXPORTS)) {
        lines.push(`▸ ${spec.signature}`);
        lines.push(`  Returns: ${spec.returns}`);
        lines.push(`  ${spec.description}`);
        lines.push(``);
    }

    lines.push(`CRITICAL: Do NOT invent hooks that are not listed above.`);
    lines.push(`If you need useWallet(), useConnection(), useSolana() — these DO NOT EXIST.`);
    lines.push(`Use useTurnkey() for signing and useVault() for balances instead.`);

    return lines.join("\n");
}

/**
 * Generates the import rules section for the AI system prompt.
 */
export function generateImportRulesSection(): string {
    const lines: string[] = [
        `═══════════════════════════════════════════════════════════════`,
        `§7. IMPORT RULES (STRICT ALLOWLIST)`,
        `═══════════════════════════════════════════════════════════════`,
        ``,
        `ONLY these imports are valid:`,
        `  import { ... } from '@keystone-os/sdk'   ← All SDK hooks`,
        `  import React, { useState, ... } from 'react'  ← React 18.2`,
        ``,
        `NEVER import these (common mistakes):`,
    ];

    for (const blocked of BLOCKED_IMPORTS.slice(0, 10)) {
        lines.push(`  ✗ ${blocked.library} → use ${blocked.alternative}`);
    }

    lines.push(``);
    lines.push(`If the user asks for a library not in the allowlist, explain that`);
    lines.push(`it's not available in the Keystone sandbox and suggest the SDK alternative.`);

    return lines.join("\n");
}

/**
 * Returns the full enhanced system prompt with all guardrail sections.
 */
export function generateFullSystemPromptAddendum(): string {
    return [generateSDKPromptSection(), "", generateImportRulesSection()].join("\n");
}

// ─── Post-Generation Validator ──────────────────────────────────────

/**
 * Validates generated code against the framework spec.
 * Returns an array of error messages (empty = code is valid).
 *
 * This is called by architect-engine.ts analyzeCode() as an additional
 * safety gate after the AI generates code.
 */
export function validateFrameworkConformance(code: string): string[] {
    const errors: string[] = [];

    // 1. Check for blocked imports
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(code)) !== null) {
        const moduleSpecifier = match[1];

        // Skip relative imports (./component, ../util)
        if (moduleSpecifier.startsWith(".")) continue;

        // Check allowlist
        if (!IMPORT_ALLOWLIST.has(moduleSpecifier)) {
            // Check if it's a known blocked library
            const blockedMatch = BLOCKED_IMPORTS.find((b) => b.pattern.test(moduleSpecifier));
            if (blockedMatch) {
                errors.push(
                    `Blocked import: '${moduleSpecifier}' — ${blockedMatch.reason}. Use ${blockedMatch.alternative} instead.`
                );
            } else {
                errors.push(
                    `Unknown import: '${moduleSpecifier}' is not available in the Keystone sandbox. Only '@keystone-os/sdk' and 'react' are available.`
                );
            }
        }
    }

    // 2. Check for fabricated hooks
    //    Find all use* calls that claim to come from the SDK
    const sdkImportMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*['"]@keystone-os\/sdk['"]/);
    if (sdkImportMatch) {
        const importedNames = sdkImportMatch[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
        for (const name of importedNames) {
            if (name && !VALID_SDK_EXPORTS.has(name)) {
                errors.push(
                    `'${name}' is not exported from '@keystone-os/sdk'. Valid exports: ${Array.from(VALID_SDK_EXPORTS).join(", ")}`
                );
            }
        }
    }

    // 3. Check for blocked API usage
    for (const { pattern, api, reason, alternative } of BLOCKED_APIS) {
        // Skip useFetch false-positive check for fetch()
        if (api === "fetch()") {
            const lines = code.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (
                    trimmed.includes("fetch(") &&
                    !trimmed.includes("useFetch") &&
                    !trimmed.startsWith("//") &&
                    !trimmed.startsWith("*")
                ) {
                    errors.push(`Blocked API: ${api} — ${reason}. Use ${alternative}.`);
                    break;
                }
            }
            continue;
        }

        if (pattern.test(code)) {
            // Ignore if it's in a comment
            const lines = code.split("\n");
            const hasRealUsage = lines.some(
                (l) => pattern.test(l) && !l.trim().startsWith("//") && !l.trim().startsWith("*")
            );
            if (hasRealUsage) {
                errors.push(`Blocked API: ${api} — ${reason}. Use ${alternative}.`);
            }
        }
    }

    return errors;
}
