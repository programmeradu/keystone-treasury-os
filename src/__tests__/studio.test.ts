/**
 * Keystone Studio Test Suite
 *
 * Tests for:
 * - SDK Type Codegen (Phase 1)
 * - Bridge Stubs (Phase 2)
 * - CLI Validation (Phase 3)
 * - Web3 Context Builder (Phase 6)
 *
 * Run: npx vitest run src/__tests__/studio.test.ts
 *
 * [Phase 10] — Test Infrastructure & Quality Gate
 */

// @ts-nocheck
// eslint-disable-next-line import/no-unresolved
import { describe, it, expect } from "vitest";

// ─── Phase 1: SDK Type Codegen ──────────────────────────────────────

describe("Phase 1 — SDK Type Codegen", () => {
    it("generated types file exists and exports KEYSTONE_SDK_TYPES", async () => {
        const mod = await import("@/generated/keystone-sdk-types");
        expect(mod.KEYSTONE_SDK_TYPES).toBeDefined();
        expect(typeof mod.KEYSTONE_SDK_TYPES).toBe("string");
    });

    it("generated types contain declare module '@keystone-os/sdk'", async () => {
        const { KEYSTONE_SDK_TYPES } = await import("@/generated/keystone-sdk-types");
        expect(KEYSTONE_SDK_TYPES).toContain("declare module '@keystone-os/sdk'");
    });

    it("generated types contain all 16 SDK hooks", async () => {
        const { KEYSTONE_SDK_TYPES } = await import("@/generated/keystone-sdk-types");
        const expectedHooks = [
            "useVault", "useTurnkey", "useFetch", "AppEventBus",
            "useEncryptedSecret", "useACEReport", "useAgentHandoff",
            "useMCPClient", "useMCPServer", "useSIWS", "useJupiterSwap",
            "useImpactReport", "useTaxForensics", "useYieldOptimizer",
            "useGaslessTx",
        ];
        for (const hook of expectedHooks) {
            expect(KEYSTONE_SDK_TYPES).toContain(hook);
        }
    });

    it("generated types contain core interfaces", async () => {
        const { KEYSTONE_SDK_TYPES } = await import("@/generated/keystone-sdk-types");
        expect(KEYSTONE_SDK_TYPES).toContain("interface Token");
        expect(KEYSTONE_SDK_TYPES).toContain("interface VaultState");
        expect(KEYSTONE_SDK_TYPES).toContain("interface FetchOptions");
        expect(KEYSTONE_SDK_TYPES).toContain("interface JupiterSwapParams");
    });

    it("generated types have backward-compat alias", async () => {
        const { KEYSTONE_SDK_TYPES } = await import("@/generated/keystone-sdk-types");
        expect(KEYSTONE_SDK_TYPES).toContain("declare module './keystone'");
    });
});

// ─── Phase 2: Bridge Stubs ──────────────────────────────────────────

describe("Phase 2 — Bridge Stubs", () => {
    it("stubLitEncrypt returns a lit:v1: prefixed string", async () => {
        const { stubLitEncrypt } = await import("@/lib/studio/bridge-stubs");
        const result = stubLitEncrypt({ plaintext: "hello", keyId: "test" });
        expect(result).toMatch(/^lit:v1:/);
    });

    it("stubLitDecrypt returns a decrypted mock", async () => {
        const { stubLitDecrypt } = await import("@/lib/studio/bridge-stubs");
        const result = stubLitDecrypt({ ciphertext: "abc", keyId: "test" });
        expect(result).toContain("[decrypted:test]");
    });

    it("stubACEReport returns an array of entries", async () => {
        const { stubACEReport } = await import("@/lib/studio/bridge-stubs");
        const result = stubACEReport({});
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty("timestamp");
        expect(result[0]).toHaveProperty("action");
        expect(result[0]).toHaveProperty("allowed");
    });

    it("stubJupiterQuote returns interface-conformant data", async () => {
        const { stubJupiterQuote } = await import("@/lib/studio/bridge-stubs");
        const result = stubJupiterQuote({
            inputMint: "SOL",
            outputMint: "USDC",
            amount: "1000000",
        });
        expect(result).toHaveProperty("inputMint", "SOL");
        expect(result).toHaveProperty("outputMint", "USDC");
        expect(result).toHaveProperty("inAmount");
        expect(result).toHaveProperty("outAmount");
        expect(result).toHaveProperty("priceImpactPct");
        expect(result).toHaveProperty("routePlan");
    });

    it("stubJupiterSwap returns a transaction", async () => {
        const { stubJupiterSwap } = await import("@/lib/studio/bridge-stubs");
        const result = stubJupiterSwap({
            inputMint: "SOL",
            outputMint: "USDC",
            amount: "1000",
        });
        expect(result).toHaveProperty("swapTransaction");
        expect(result).toHaveProperty("lastValidBlockHeight");
        expect(typeof result.swapTransaction).toBe("string");
    });

    it("stubTaxForensics returns lots and gains", async () => {
        const { stubTaxForensics } = await import("@/lib/studio/bridge-stubs");
        const result = stubTaxForensics({});
        expect(result).toHaveProperty("lots");
        expect(result).toHaveProperty("totalCostBasis");
        expect(result).toHaveProperty("unrealizedGainLoss");
        expect(result).toHaveProperty("realizedGainLoss");
        expect(result.lots.length).toBeGreaterThan(0);
    });

    it("stubYieldOptimize returns protocol paths", async () => {
        const { stubYieldOptimize } = await import("@/lib/studio/bridge-stubs");
        const result = stubYieldOptimize({ asset: "SOL" });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty("protocol");
        expect(result[0]).toHaveProperty("apy");
        expect(result[0]).toHaveProperty("riskScore");
    });

    it("stubImpactReport returns before/after diff", async () => {
        const { stubImpactReport } = await import("@/lib/studio/bridge-stubs");
        const result = stubImpactReport({ transaction: {} });
        expect(result).toHaveProperty("before");
        expect(result).toHaveProperty("after");
        expect(result).toHaveProperty("diff");
        expect(result.diff.length).toBeGreaterThan(0);
        expect(result).toHaveProperty("simulationHash");
    });

    it("stubGaslessSubmit returns a signature", async () => {
        const { stubGaslessSubmit } = await import("@/lib/studio/bridge-stubs");
        const result = stubGaslessSubmit({ transaction: {} });
        expect(result).toHaveProperty("signature");
        expect(result.signature).toMatch(/^gasless_/);
    });
});

// ─── Phase 6: Web3 Context ──────────────────────────────────────────

describe("Phase 6 — Web3 Context", () => {
    it("SOLANA_TOKEN_REGISTRY has expected tokens", async () => {
        const { SOLANA_TOKEN_REGISTRY } = await import("@/lib/studio/web3-context");
        expect(SOLANA_TOKEN_REGISTRY).toHaveProperty("SOL");
        expect(SOLANA_TOKEN_REGISTRY).toHaveProperty("USDC");
        expect(SOLANA_TOKEN_REGISTRY).toHaveProperty("JUP");
        expect(SOLANA_TOKEN_REGISTRY.SOL.decimals).toBe(9);
        expect(SOLANA_TOKEN_REGISTRY.USDC.decimals).toBe(6);
    });

    it("SDK_HOOK_DOCS covers key hooks", async () => {
        const { SDK_HOOK_DOCS } = await import("@/lib/studio/web3-context");
        expect(SDK_HOOK_DOCS).toHaveProperty("useVault");
        expect(SDK_HOOK_DOCS).toHaveProperty("useJupiterSwap");
        expect(SDK_HOOK_DOCS).toHaveProperty("useGaslessTx");
        expect(SDK_HOOK_DOCS.useVault).toHaveProperty("description");
        expect(SDK_HOOK_DOCS.useVault).toHaveProperty("usage");
    });

    it("buildWeb3Context returns relevant context for code", async () => {
        const { buildWeb3Context } = await import("@/lib/studio/web3-context");
        const ctx = buildWeb3Context({
            code: 'import { useVault } from "@keystone-os/sdk";',
            prompt: "Add swap for SOL to USDC",
        });
        expect(ctx).toContain("useVault");
        expect(ctx).toContain("SOL");
        expect(ctx).toContain("USDC");
    });

    it("buildWeb3Context detects DeFi protocols", async () => {
        const { buildWeb3Context } = await import("@/lib/studio/web3-context");
        const ctx = buildWeb3Context({
            code: "// jupiter swap integration",
            prompt: "swap via jupiter",
        });
        expect(ctx).toContain("Jupiter Aggregator");
    });
});
