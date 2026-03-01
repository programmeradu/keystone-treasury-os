/**
 * Bridge Stubs — Realistic mock data for all Sovereign OS 2026 bridge methods.
 *
 * Used by LivePreview.tsx host-side BridgeController to return meaningful
 * preview data instead of throwing "not implemented" errors.
 *
 * Each stub returns interface-conformant data matching the SDK's typed interfaces
 * so Mini-App preview rendering never breaks.
 *
 * [Phase 2] — Iframe Bridge Fix
 */

// ─── Lit Protocol (Encrypted Secrets) ───────────────────────────────

export function stubLitEncrypt(params: { plaintext: string; keyId?: string }): string {
    // Return a mock base64 "encrypted" string that looks realistic
    const fakeEncrypted = btoa(`lit_enc_${params.keyId || "default"}:${params.plaintext.slice(0, 8)}...`);
    return `lit:v1:${fakeEncrypted}`;
}

export function stubLitDecrypt(params: { ciphertext: string; keyId?: string }): string {
    // Return a mock decrypted value
    return `[decrypted:${params.keyId || "default"}] mock_secret_value`;
}

// ─── ACE Report ─────────────────────────────────────────────────────

export function stubACEReport(params: { since?: string }) {
    return [
        {
            timestamp: new Date(Date.now() - 3600_000).toISOString(),
            action: "transfer",
            actor: "treasury_admin",
            resource: "vault:main",
            allowed: true,
            policyId: "pol_treasury_transfer_v1",
        },
        {
            timestamp: new Date(Date.now() - 7200_000).toISOString(),
            action: "swap",
            actor: "trader_bot",
            resource: "jupiter:SOL-USDC",
            allowed: true,
            policyId: "pol_defi_swap_v1",
        },
        {
            timestamp: new Date(Date.now() - 10800_000).toISOString(),
            action: "withdraw",
            actor: "unknown_signer",
            resource: "vault:main",
            allowed: false,
            policyId: "pol_withdrawal_limit_v1",
        },
    ];
}

// ─── MCP Call (Model Context Protocol) ──────────────────────────────

export function stubMCPCall(params: { serverUrl: string; tool: string; params?: Record<string, unknown> }) {
    return {
        result: `[mock] ${params.tool} via ${params.serverUrl}`,
        status: "success",
        executionTimeMs: Math.floor(Math.random() * 500) + 100,
        metadata: {
            toolCalled: params.tool,
            server: params.serverUrl,
            timestamp: new Date().toISOString(),
        },
    };
}

// ─── Jupiter Swap ───────────────────────────────────────────────────

export function stubJupiterQuote(params: { inputMint: string; outputMint: string; amount: string; slippageBps?: number }) {
    const inAmount = params.amount || "1000000";
    const mockRate = 23.42; // SOL/USDC approximate
    const outAmount = String(Math.floor(parseFloat(inAmount) * mockRate));

    return {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        inAmount: inAmount,
        outAmount: outAmount,
        priceImpactPct: 0.12,
        routePlan: [
            {
                swapInfo: {
                    ammKey: "mock_amm_" + crypto.randomUUID().slice(0, 8),
                    label: "Raydium V4",
                    inputMint: params.inputMint,
                    outputMint: params.outputMint,
                    feeAmount: "2500",
                },
                percent: 100,
            },
        ],
    };
}

export function stubJupiterSwap(params: { inputMint: string; outputMint: string; amount: string; slippageBps?: number }) {
    return {
        swapTransaction: "mock_swap_tx_" + crypto.randomUUID().slice(0, 16),
        lastValidBlockHeight: 250_000_000 + Math.floor(Math.random() * 1000),
        prioritizationFeeLamports: 50000,
    };
}

// ─── Impact Report ──────────────────────────────────────────────────

export function stubImpactReport(params: { transaction?: unknown }) {
    return {
        before: {
            activeVault: "Main Portfolio",
            balances: { SOL: 124.5, USDC: 5400.2 },
            tokens: [
                { symbol: "SOL", name: "Solana", balance: 124.5, price: 23.40 },
                { symbol: "USDC", name: "USD Coin", balance: 5400.2, price: 1.00 },
            ],
        },
        after: {
            activeVault: "Main Portfolio",
            balances: { SOL: 123.5, USDC: 5423.6 },
            tokens: [
                { symbol: "SOL", name: "Solana", balance: 123.5, price: 23.40 },
                { symbol: "USDC", name: "USD Coin", balance: 5423.6, price: 1.00 },
            ],
        },
        diff: [
            { symbol: "SOL", delta: -1.0, percentChange: -0.80 },
            { symbol: "USDC", delta: 23.40, percentChange: 0.43 },
        ],
        simulationHash: "0x" + crypto.randomUUID().replace(/-/g, "").slice(0, 32),
    };
}

// ─── Tax Forensics ──────────────────────────────────────────────────

export function stubTaxForensics(params: { since?: string }) {
    return {
        lots: [
            { mint: "So11111111111111111111111111111111111111112", amount: 50, costBasis: 1125.00, acquiredAt: "2025-06-15T00:00:00Z" },
            { mint: "So11111111111111111111111111111111111111112", amount: 74.5, costBasis: 1855.05, acquiredAt: "2025-09-22T00:00:00Z" },
            { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", amount: 5400.2, costBasis: 5400.20, acquiredAt: "2025-11-01T00:00:00Z" },
        ],
        totalCostBasis: 8380.25,
        unrealizedGainLoss: 542.10,
        realizedGainLoss: 312.40,
    };
}

// ─── Yield Optimizer ────────────────────────────────────────────────

export function stubYieldOptimize(params: { asset: string }) {
    return [
        {
            protocol: "Marinade (mSOL)",
            apy: 7.2,
            riskScore: 15,
            tvl: 2_400_000_000,
            instructions: [],
        },
        {
            protocol: "Jito MEV",
            apy: 8.4,
            riskScore: 25,
            tvl: 1_800_000_000,
            instructions: [],
        },
        {
            protocol: "Kamino kSOL",
            apy: 6.9,
            riskScore: 20,
            tvl: 950_000_000,
            instructions: [],
        },
    ];
}

// ─── Gasless Transaction ────────────────────────────────────────────

export function stubGaslessSubmit(params: { transaction: unknown; description?: string }) {
    return {
        signature: "gasless_" + crypto.randomUUID().slice(0, 12),
    };
}

// ─── SIWS (Sign-In With Solana) ─────────────────────────────────────

export function stubSIWSSign(walletAddress: string | null) {
    return {
        message: "Sign in with Solana — Keystone OS",
        signature: "siws_sig_" + crypto.randomUUID().slice(0, 12),
        address: walletAddress || "7KeY...StUdIo",
        chainId: 101,
    };
}

// ─── Blink Export ───────────────────────────────────────────────────

export function stubBlinkExport(params: { label?: string }) {
    return {
        url: `https://blink.solana.com/action?label=${encodeURIComponent(params.label ?? "action")}`,
        actionId: crypto.randomUUID(),
    };
}
