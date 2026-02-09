/**
 * Token Brand Colors
 * Maps well-known Solana token symbols to their official brand colors.
 * Falls back to a deterministic hash-based color for unknown tokens.
 */

const BRAND_COLORS: Record<string, string> = {
    // Major L1 / Wrapped
    SOL:   "#9945FF",
    WSOL:  "#9945FF",
    ETH:   "#627EEA",
    WETH:  "#627EEA",
    BTC:   "#F7931A",
    WBTC:  "#F7931A",

    // Stablecoins
    USDC:  "#2775CA",
    USDT:  "#26A17B",
    DAI:   "#F5AC37",
    BUSD:  "#F0B90B",
    TUSD:  "#002868",
    FRAX:  "#000000",
    PYUSD: "#0070E0",
    EURC:  "#2775CA",
    USDP:  "#00694B",

    // Solana DeFi
    JUP:   "#36E89A",
    RAY:   "#5AC4BE",
    ORCA:  "#FFD15C",
    MNDE:  "#6DCDCB",
    MSOL:  "#6DCDCB",
    JITOSOL:"#83D68A",
    BSOL:  "#5AC4BE",
    JTO:   "#2F4858",
    PYTH:  "#6C41D2",
    W:     "#5C35D2",
    TENSOR:"#A855F7",
    DRIFT: "#E14BEC",
    MARGINFI:"#4A9EFF",
    HNT:   "#474DFF",
    MOBILE:"#2563EB",
    IOT:   "#22C55E",
    RENDER:"#E03C3C",
    RNDR:  "#E03C3C",

    // Memecoins
    BONK:  "#F8A626",
    WIF:   "#C8A26A",
    POPCAT:"#FF6B6B",
    MEW:   "#7B61FF",
    BOME:  "#00DC82",
    MYRO:  "#F97316",
    SAMO:  "#00CED1",
    SLERF: "#FF69B4",

    // Other
    LINK:  "#2A5ADA",
    UNI:   "#FF007A",
    AAVE:  "#B6509E",
    CRV:   "#FFCE45",
    LDO:   "#00A3FF",
    MKR:   "#1AAB9B",
    SNX:   "#00D1FF",
    COMP:  "#00D395",
    SUSHI: "#FA52A0",
};

/**
 * Generate a deterministic HSL color from a string.
 * Produces vibrant, visually distinct colors.
 */
function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Get the brand color for a token by symbol.
 * Falls back to a deterministic hash color for unknown tokens.
 */
export function getTokenColor(symbol: string): string {
    const key = (symbol || "").toUpperCase();
    return BRAND_COLORS[key] || hashColor(key);
}

/**
 * Get brand colors for an array of token symbols.
 */
export function getTokenColors(symbols: string[]): string[] {
    return symbols.map(s => getTokenColor(s));
}
