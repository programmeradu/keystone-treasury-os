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
    priceUrl?: string;
}> = {
    SOL: { symbol: "SOL", name: "Solana", mint: "So11111111111111111111111111111111111111112", decimals: 9, coingeckoId: "solana", priceUrl: "https://lite-api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112" },
    USDC: { symbol: "USDC", name: "USD Coin", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, coingeckoId: "usd-coin", priceUrl: "https://lite-api.jup.ag/price/v2?ids=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
    USDT: { symbol: "USDT", name: "Tether", mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6, coingeckoId: "tether", priceUrl: "https://lite-api.jup.ag/price/v2?ids=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" },
    BONK: { symbol: "BONK", name: "Bonk", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5, coingeckoId: "bonk", priceUrl: "https://lite-api.jup.ag/price/v2?ids=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
    JUP: { symbol: "JUP", name: "Jupiter", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", decimals: 6, coingeckoId: "jupiter-exchange-solana", priceUrl: "https://lite-api.jup.ag/price/v2?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
    RAY: { symbol: "RAY", name: "Raydium", mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", decimals: 6, coingeckoId: "raydium", priceUrl: "https://lite-api.jup.ag/price/v2?ids=4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R" },
    ORCA: { symbol: "ORCA", name: "Orca", mint: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", decimals: 6, coingeckoId: "orca", priceUrl: "https://lite-api.jup.ag/price/v2?ids=orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE" },
    MNDE: { symbol: "MNDE", name: "Marinade", mint: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey", decimals: 9, coingeckoId: "marinade", priceUrl: "https://lite-api.jup.ag/price/v2?ids=MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey" },
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
    // Extended SDK — v1.1
    usePortfolio: {
        name: "usePortfolio",
        description: "Portfolio summary with USD values and allocation percentages — wraps useVault with price enrichment",
        usage: `const { tokens, totalValue, loading } = usePortfolio();`,
        returns: "UsePortfolioResult { tokens: { symbol, balance, usdValue, percentage }[], totalValue: number, loading: boolean }",
    },
    useTheme: {
        name: "useTheme",
        description: "Theme state for dark/light mode support",
        usage: `const { theme, setTheme, isDark } = useTheme();`,
        returns: "UseThemeResult { theme: 'dark'|'light', setTheme: (t) => void, isDark: boolean }",
    },
    useTokenPrice: {
        name: "useTokenPrice",
        description: "Live token price for a single mint via Jupiter Price API",
        usage: `const { price, loading, error } = useTokenPrice('So11111111111111111111111111111111111111112');`,
        params: "mint: string",
        returns: "UseTokenPriceResult { price: number|null, loading: boolean, error: string|null }",
    },
    useNotification: {
        name: "useNotification",
        description: "In-app notification system for alerts and messages",
        usage: `const { send, notifications, dismiss, unreadCount } = useNotification();\nsend("Swap completed!", "success");`,
        returns: "UseNotificationResult { notifications, send, dismiss, clearAll, unreadCount }",
    },
    useStorage: {
        name: "useStorage",
        description: "Persistent key-value storage scoped to the mini-app namespace",
        usage: `const storage = useStorage("my-app");\nstorage.set("key", value);\nconst val = storage.get("key");`,
        params: "namespace?: string",
        returns: "UseStorageResult { get, set, remove, keys, clear }",
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
            "API: useFetch('https://api-v3.raydium.io/pools/info/list') for pool data",
        ],
    },
    coingecko: {
        name: "CoinGecko",
        description: "Comprehensive crypto market data API — prices, market cap, volume, 24h changes",
        website: "https://www.coingecko.com",
        category: "Data",
        tips: [
            "useFetch('https://api.coingecko.com/api/v3/simple/price?ids=solana,bonk&vs_currencies=usd&include_24hr_change=true')",
            "Use coingeckoId from token registry for correct IDs",
            "Free tier: 10-30 calls/min, sufficient for polling every 30s",
        ],
    },
    dexscreener: {
        name: "DexScreener",
        description: "Real-time DEX pair data — price, volume, liquidity, price changes across timeframes",
        website: "https://dexscreener.com",
        category: "Data",
        tips: [
            "useFetch('https://api.dexscreener.com/latest/dex/tokens/MINT_ADDRESS') for token pairs",
            "useFetch('https://api.dexscreener.com/latest/dex/search?q=SYMBOL') for search",
            "Response includes h1, h6, h24 price changes and volume",
        ],
    },
    defillama: {
        name: "DeFi Llama",
        description: "DeFi analytics — TVL, yield pools, protocol rankings across all chains",
        website: "https://defillama.com",
        category: "Data",
        tips: [
            "useFetch('https://yields.llama.fi/pools') — filter by chain === 'Solana'",
            "useFetch('https://api.llama.fi/protocols') — protocol TVL rankings",
            "Best source for yield/APY data across Solana DeFi protocols",
        ],
    },
    pyth: {
        name: "Pyth Network",
        description: "High-fidelity oracle price feeds used by DeFi protocols on Solana",
        website: "https://pyth.network",
        category: "Oracle",
        tips: [
            "SOL/USD feed ID: 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
            "useFetch('https://hermes.pyth.network/v2/updates/price/latest?ids[]=FEED_ID')",
            "Sub-second price updates, ideal for real-time trading dashboards",
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
            const mints = mentionedTokens.map(sym => SOLANA_TOKEN_REGISTRY[sym].mint);
            for (const sym of mentionedTokens) {
                const t = SOLANA_TOKEN_REGISTRY[sym];
                sections.push(`- **${t.symbol}** (${t.name}): mint=\`${t.mint}\`, decimals=${t.decimals}, coingeckoId=\`${t.coingeckoId}\``);
            }
            sections.push(`\nQuick price URL: \`useFetch('https://lite-api.jup.ag/price/v2?ids=${mints.join(",")}')\``);
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
