// Central Chain Registry for multi-ecosystem support
// - Normalizes chain names from free-text ("op", "TON", "smart chain", etc.)
// - Provides canonical labels and per-integration identifiers (DeFiLlama, CoinGecko)
// - Includes EVM chainId when applicable

export type Ecosystem =
  | "EVM"
  | "Solana"
  | "TRON"
  | "TON"
  | "Bitcoin"
  | "Cosmos"
  | "Aptos"
  | "Sui"
  | "Near"
  | "Other";

export interface ChainInfo {
  // Canonical id (lowercase slug)
  id: string;
  // Display label
  label: string;
  // Aliases used to recognize the chain from user input
  aliases: string[];
  // Ecosystem family
  ecosystem: Ecosystem;
  // EVM chain id when applicable
  evmChainId?: number;
  // External ids used by integrations
  defillamaChain?: string; // https://defillama.com/docs/api
  coingeckoId?: string; // for native token price
}

// Minimal but comprehensive set covering major networks and common requests
// Note: You can freely extend this registry over time — tools will pick it up automatically
export const CHAIN_REGISTRY: ChainInfo[] = [
  // EVM L1s/L2s
  { id: "ethereum", label: "Ethereum", aliases: ["ethereum", "eth", "mainnet"], ecosystem: "EVM", evmChainId: 1, defillamaChain: "ethereum", coingeckoId: "ethereum" },
  { id: "base", label: "Base", aliases: ["base"], ecosystem: "EVM", evmChainId: 8453, defillamaChain: "base", coingeckoId: "ethereum" },
  { id: "arbitrum", label: "Arbitrum", aliases: ["arbitrum", "arb", "arbi"], ecosystem: "EVM", evmChainId: 42161, defillamaChain: "arbitrum", coingeckoId: "ethereum" },
  { id: "optimism", label: "Optimism", aliases: ["optimism", "op"], ecosystem: "EVM", evmChainId: 10, defillamaChain: "optimism", coingeckoId: "ethereum" },
  { id: "polygon", label: "Polygon", aliases: ["polygon", "matic"], ecosystem: "EVM", evmChainId: 137, defillamaChain: "polygon", coingeckoId: "matic-network" },
  { id: "binance", label: "BNB Chain", aliases: ["bsc", "binance", "bnb", "opbnb", "smart chain"], ecosystem: "EVM", evmChainId: 56, defillamaChain: "binance", coingeckoId: "binancecoin" },
  { id: "avalanche", label: "Avalanche", aliases: ["avalanche", "avax"], ecosystem: "EVM", evmChainId: 43114, defillamaChain: "avalanche", coingeckoId: "avalanche-2" },
  { id: "fantom", label: "Fantom", aliases: ["fantom", "ftm"], ecosystem: "EVM", evmChainId: 250, defillamaChain: "fantom", coingeckoId: "fantom" },
  { id: "gnosis", label: "Gnosis", aliases: ["gnosis", "xdai"], ecosystem: "EVM", evmChainId: 100, defillamaChain: "gnosis", coingeckoId: "gnosis" },
  { id: "linea", label: "Linea", aliases: ["linea"], ecosystem: "EVM", evmChainId: 59144, defillamaChain: "linea", coingeckoId: "ethereum" },
  { id: "scroll", label: "Scroll", aliases: ["scroll"], ecosystem: "EVM", evmChainId: 534352, defillamaChain: "scroll", coingeckoId: "ethereum" },
  { id: "zksync", label: "zkSync Era", aliases: ["zksync", "zk sync", "zk sync era", "era"], ecosystem: "EVM", evmChainId: 324, defillamaChain: "zksync era", coingeckoId: "ethereum" },
  { id: "mantle", label: "Mantle", aliases: ["mantle", "mnt"], ecosystem: "EVM", evmChainId: 5000, defillamaChain: "mantle", coingeckoId: "mantle" },
  { id: "celo", label: "Celo", aliases: ["celo"], ecosystem: "EVM", evmChainId: 42220, defillamaChain: "celo", coingeckoId: "celo" },
  { id: "metis", label: "Metis", aliases: ["metis"], ecosystem: "EVM", evmChainId: 1088, defillamaChain: "metis", coingeckoId: "metis-token" },

  // Non-EVM majors
  { id: "solana", label: "Solana", aliases: ["solana", "sol"], ecosystem: "Solana", defillamaChain: "solana", coingeckoId: "solana" },
  { id: "tron", label: "TRON", aliases: ["tron", "trx"], ecosystem: "TRON", defillamaChain: "tron", coingeckoId: "tron" },
  { id: "ton", label: "TON", aliases: ["ton", "toncoin", "the open network"], ecosystem: "TON", defillamaChain: "ton", coingeckoId: "the-open-network" },
  { id: "near", label: "NEAR", aliases: ["near"], ecosystem: "Near", defillamaChain: "near", coingeckoId: "near" },
  { id: "aptos", label: "Aptos", aliases: ["aptos", "apt"], ecosystem: "Aptos", defillamaChain: "aptos", coingeckoId: "aptos" },
  { id: "sui", label: "Sui", aliases: ["sui"], ecosystem: "Sui", defillamaChain: "sui", coingeckoId: "sui" },

  // UTXO majors (for reference)
  { id: "bitcoin", label: "Bitcoin", aliases: ["bitcoin", "btc"], ecosystem: "Bitcoin", defillamaChain: "bitcoin", coingeckoId: "bitcoin" },
  { id: "litecoin", label: "Litecoin", aliases: ["litecoin", "ltc"], ecosystem: "Other", defillamaChain: "litecoin", coingeckoId: "litecoin" },
  { id: "dogecoin", label: "Dogecoin", aliases: ["dogecoin", "doge"], ecosystem: "Other", defillamaChain: "dogecoin", coingeckoId: "dogecoin" },
];

// Build a fast alias lookup map
const ALIAS_MAP: Record<string, ChainInfo> = (() => {
  const map: Record<string, ChainInfo> = {};
  for (const c of CHAIN_REGISTRY) {
    for (const a of c.aliases) map[a.toLowerCase()] = c;
    map[c.id.toLowerCase()] = c;
    map[c.label.toLowerCase()] = c;
  }
  return map;
})();

export function resolveChain(input?: string | null): ChainInfo | undefined {
  if (!input) return undefined;
  const key = input.trim().toLowerCase();
  return ALIAS_MAP[key];
}

// Tries to find a chain mention anywhere in a free-text sentence
export function resolveChainFromText(text?: string | null): ChainInfo | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  // Prioritize longer aliases first to avoid mis-matches (e.g., "op" in words)
  const all = Object.keys(ALIAS_MAP).sort((a, b) => b.length - a.length);
  for (const alias of all) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^a-z0-9_])(${escaped})(?:$|[^a-z0-9_])`, "i");
    if (re.test(lower)) return ALIAS_MAP[alias];
  }
  return undefined;
}

export function toDefiLlamaChain(input?: string | null): string | undefined {
  const c = resolveChain(input || undefined);
  return c?.defillamaChain;
}

export function toDefiLlamaChainFromText(text?: string | null): string | undefined {
  const c = resolveChainFromText(text || undefined);
  return c?.defillamaChain;
}

export function toEvmChainId(input?: string | null): number | undefined {
  const c = resolveChain(input || undefined);
  return c?.evmChainId;
}