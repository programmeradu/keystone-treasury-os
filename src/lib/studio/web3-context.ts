/**
 * Web3 Context Provider — Contextual Web3 knowledge injection for the AI Architect.
 *
 * Provides program IDLs, token metadata, DeFi protocol docs, and common Solana
 * patterns as pre-built context chunks that get injected into AI prompts.
 *
 * The AI Architect can use these to give contextually-aware suggestions about
 * Solana programs, Jupiter routes, Marinade staking, etc.
 *
 * [Phase 6] — Contextual Web3 Knowledge Injection
 */

// ─── Token Registry ─────────────────────────────────────────────────

export const SOLANA_TOKEN_REGISTRY: Record<string, {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    coingeckoId?: string;
}> = {
    SOL: { symbol: "SOL", name: "Solana", mint: "So11111111111111111111111111111111111111112", decimals: 9, coingeckoId: "solana" },
    USDC: { symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, coingeckoId: "usd-coin" },
    USDT: { symbol: "USDT", name: "Tether", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, coingeckoId: "tether" },
    BONK: { symbol: "BONK", name: "Bonk", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5, coingeckoId: "bonk" },
    JUP: { symbol: "JUP", name: "Jupiter", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6, coingeckoId: "jupiter-exchange-solana" },
    RAY: { symbol: "RAY", name: "Raydium", mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", decimals: 6, coingeckoId: "raydium" },
    ORCA: { symbol: "ORCA", name: "Orca", mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", decimals: 6, coingeckoId: "orca" },
    MNDE: { symbol: "MNDE", name: "Marinade", mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey", decimals: 9, coingeckoId: "marinade" },
};

// ─── SDK Hook Documentation ─────────────────────────────────────────

export const SDK_HOOK_DOCS: Record<string, {
    name: string;
    description: string;
    usage: string;
    params?: string;
    returns: string;
}> = {
    useVault: {
        name: "useVault",
        description: "Access the connected Keystone vault's token balances and metadata",
        usage: `const { tokens, balances, activeVault } = useVault();`,
        returns: "VaultState { activeVault: string, balances: Record<string, number>, tokens: Token[] }",
    },
    useTurnkey: {
        name: "useTurnkey",
        description: "Institutional-grade wallet operations via Turnkey API",
        usage: `const { signTransaction, getPublicKey } = useTurnkey();`,
        returns: "TurnkeyState { getPublicKey: () => Promise<string>, signTransaction: (tx, desc?) => Promise<{ signature }> }",
    },
    useFetch: {
        name: "useFetch",
        description: "Proxied HTTP requests through the Keystone security gateway (blocks direct fetch)",
        usage: `const { data, loading, error, refetch } = useFetch<MyType>(url, options);`,
        params: "url: string, options?: FetchOptions { method, headers, body, observability }",
        returns: "FetchResult<T> { data, error, loading, refetch }",
    },
    useJupiterSwap: {
        name: "useJupiterSwap",
        description: "Deep-routed token swaps via Jupiter aggregator (best price, multi-hop)",
        usage: `const { swap, getQuote, loading, error } = useJupiterSwap();\nconst quote = await getQuote({ inputMint, outputMint, amount, slippageBps });`,
        params: "JupiterSwapParams { inputMint, outputMint, amount, slippageBps? }",
        returns: "UseJupiterSwapResult { swap, getQuote, loading, error }",
    },
    useImpactReport: {
        name: "useImpactReport",
        description: "Pre-flight transaction simulation showing before/after vault state diff",
        usage: `const { simulate, report } = useImpactReport();\nconst impact = await simulate(transaction);`,
        returns: "UseImpactReportResult { simulate, report, loading, error }",
    },
    useEncryptedSecret: {
        name: "useEncryptedSecret",
        description: "Encrypt/decrypt secrets using Lit Protocol for secure storage",
        usage: `const { encrypt, decrypt } = useEncryptedSecret();\nconst cipher = await encrypt("my-secret", "key-id");`,
        returns: "UseEncryptedSecretResult { encrypt, decrypt, loading, error }",
    },
    useSIWS: {
        name: "useSIWS",
        description: "Sign-In With Solana for session-based authentication",
        usage: `const { signIn, verify, session } = useSIWS();`,
        returns: "SIWSState { signIn, verify, session }",
    },
    useGaslessTx: {
        name: "useGaslessTx",
        description: "Submit transactions without requiring SOL for gas fees (fee payer relay)",
        usage: `const { submit } = useGaslessTx();\nconst { signature } = await submit(transaction, "Swap SOL for USDC");`,
        returns: "UseGaslessTxResult { submit, loading, error }",
    },
    useTaxForensics: {
        name: "useTaxForensics",
        description: "Analyze tax lots, cost basis, and realized/unrealized gains",
        usage: `const { result, loading, refetch } = useTaxForensics({ since: new Date("2025-01-01") });`,
        returns: "UseTaxForensicsResult { result, loading, error, refetch }",
    },
    useYieldOptimizer: {
        name: "useYieldOptimizer",
        description: "Discover optimal yield paths across Solana DeFi protocols",
        usage: `const { paths, loading } = useYieldOptimizer("SOL");`,
        returns: "UseYieldOptimizerResult { paths: YieldPath[], loading, error, refetch }",
    },
    useMCPClient: {
        name: "useMCPClient",
        description: "Call tools on a Model Context Protocol server",
        usage: `const { call } = useMCPClient("https://mcp.example.com");\nconst result = await call("search", { query: "..." });`,
        returns: "UseMCPClientResult { call, loading, error }",
    },
    useAgentHandoff: {
        name: "useAgentHandoff",
        description: "Hand off execution context to another AI agent",
        usage: `const { handoffTo } = useAgentHandoff("my-agent");\nawait handoffTo("other-agent", { key: "value" });`,
        returns: "UseAgentHandoffResult { handoffTo }",
    },
};

// ─── DeFi Protocol Knowledge ────────────────────────────────────────

export const DEFI_PROTOCOL_DOCS: Record<string, {
    name: string;
    description: string;
    website: string;
    category: string;
    tips: string[];
}> = {
    jupiter: {
        name: "Jupiter Aggregator",
        description: "Best-price DEX aggregator on Solana with multi-hop routing",
        website: "https://jup.ag",
        category: "DEX",
        tips: [
            "Always use slippageBps (default 50 = 0.5%) to protect against front-running",
            "Use getQuote before swap to show the user expected output",
            "Jupiter routes through Raydium, Orca, Meteora, and other DEXes automatically",
        ],
    },
    marinade: {
        name: "Marinade Finance",
        description: "Liquid staking protocol — stake SOL and receive mSOL",
        website: "https://marinade.finance",
        category: "Staking",
        tips: [
            "mSOL accrues staking rewards and is DeFi-composable",
            "Native staking offers higher APY but locks SOL for an epoch",
        ],
    },
    raydium: {
        name: "Raydium",
        description: "AMM and concentrated liquidity DEX on Solana",
        website: "https://raydium.io",
        category: "DEX",
        tips: [
            "Concentrated liquidity pools (CLMM) offer higher capital efficiency",
            "Standard AMM pools follow constant product curve (x*y=k)",
        ],
    },
};

// ─── Context Builder ────────────────────────────────────────────────

/**
 * Builds a contextual Web3 knowledge string for AI prompt injection.
 * Called by the AI Architect to provide relevant knowledge based on
 * the user's current code and prompt.
 */
export function buildWeb3Context(opts: {
    code: string;
    prompt: string;
    includeTokens?: boolean;
    includeProtocols?: boolean;
}): string {
    const sections: string[] = [];

    // Detect which hooks are used or mentioned
    const mentionedHooks = Object.keys(SDK_HOOK_DOCS).filter(
        (hook) => opts.code.includes(hook) || opts.prompt.toLowerCase().includes(hook.toLowerCase())
    );

    if (mentionedHooks.length > 0) {
        sections.push("## Keystone SDK Hooks In Use\n");
        for (const hook of mentionedHooks) {
            const doc = SDK_HOOK_DOCS[hook];
            sections.push(`### ${doc.name}\n${doc.description}\n\`\`\`tsx\n${doc.usage}\n\`\`\`\nReturns: \`${doc.returns}\`\n`);
        }
    }

    // Detect token mentions
    if (opts.includeTokens !== false) {
        const mentionedTokens = Object.keys(SOLANA_TOKEN_REGISTRY).filter(
            (sym) => opts.code.includes(sym) || opts.prompt.includes(sym)
        );
        if (mentionedTokens.length > 0) {
            sections.push("## Token Metadata\n");
            for (const sym of mentionedTokens) {
                const t = SOLANA_TOKEN_REGISTRY[sym];
                sections.push(`- **${t.symbol}** (${t.name}): mint=\`${t.mint}\`, decimals=${t.decimals}`);
            }
            sections.push("");
        }
    }

    // Detect protocol mentions
    if (opts.includeProtocols !== false) {
        const mentionedProtocols = Object.keys(DEFI_PROTOCOL_DOCS).filter(
            (name) => opts.code.toLowerCase().includes(name) || opts.prompt.toLowerCase().includes(name)
        );
        if (mentionedProtocols.length > 0) {
            sections.push("## DeFi Protocol Knowledge\n");
            for (const name of mentionedProtocols) {
                const p = DEFI_PROTOCOL_DOCS[name];
                sections.push(`### ${p.name}\n${p.description}\n**Tips:**`);
                p.tips.forEach((tip) => sections.push(`- ${tip}`));
                sections.push("");
            }
        }
    }

    return sections.join("\n");
}
