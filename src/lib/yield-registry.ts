/**
 * Yield Token Registry
 *
 * Classifies every token in a vault into one of three categories:
 *   - IDLE:          Base assets earning nothing (SOL, USDC, USDT, etc.)
 *   - YIELD_BEARING: Liquid staking tokens / LP positions actively earning yield
 *   - SPECULATIVE:   Everything else (meme coins, governance tokens, etc.)
 *
 * Also stores metadata for each known yield-bearing mint so the UI can
 * display protocol names, icons, and live APYs.
 */

export type TokenCategory = "IDLE" | "YIELD_BEARING" | "SPECULATIVE";

export interface YieldTokenMeta {
    symbol: string;
    protocol: string;
    /** Conservative fallback APY to show when live fetch fails */
    fallbackApy: number;
    /** Human-readable description */
    description: string;
}

// ─── Idle base assets (earning 0%) ─────────────────────────────────
export const IDLE_MINTS = new Set([
    "So11111111111111111111111111111111111111112", // WSOL / native SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", // stSOL (Lido, sunset)
]);

export const IDLE_SYMBOLS = new Set(["SOL", "WSOL", "USDC", "USDT"]);

// ─── Native staking (synthetic mint used by VaultContext) ──────────
export const NATIVE_STAKING_MINT = "STAKED_SOL_NATIVE";

// ─── Known yield-bearing liquid staking tokens ─────────────────────
export const YIELD_MINTS: Record<string, YieldTokenMeta> = {
    // Native Solana staking (not an actual SPL mint — synthetic entry from VaultContext)
    [NATIVE_STAKING_MINT]: {
        symbol: "Staked SOL",
        protocol: "Native Staking",
        fallbackApy: 6.5, // Solana base staking yield (~6-7% as of early 2026)
        description: "Native Solana validator staking",
    },
    // JitoSOL
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn": {
        symbol: "JitoSOL",
        protocol: "Jito",
        fallbackApy: 6.3,
        description: "MEV-enhanced liquid staking via Jito",
    },
    // mSOL
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": {
        symbol: "mSOL",
        protocol: "Marinade",
        fallbackApy: 6.1,
        description: "Marinade decentralized stake pool",
    },
    // bSOL
    "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1": {
        symbol: "bSOL",
        protocol: "BlazeStake",
        fallbackApy: 6.0,
        description: "BlazeStake delegated staking",
    },
    // JupSOL
    "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v": {
        symbol: "JupSOL",
        protocol: "Jupiter",
        fallbackApy: 6.2,
        description: "Jupiter liquid staking token",
    },
    // INF (Sanctum Infinity)
    "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm": {
        symbol: "INF",
        protocol: "Sanctum",
        fallbackApy: 6.4,
        description: "Sanctum Infinity multi-LST pool",
    },
    // bonkSOL (Sanctum LST)
    "BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs": {
        symbol: "bonkSOL",
        protocol: "Sanctum/Bonk",
        fallbackApy: 5.8,
        description: "Bonk community stake pool",
    },
    // dSOL (Drift)
    "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ": {
        symbol: "dSOL",
        protocol: "Drift",
        fallbackApy: 6.3,
        description: "Drift Staked SOL",
    },
    // pathSOL
    "pathdXw4He1Xk3eX84pDdDZnGKEme3GivBamGCVPZ5a": {
        symbol: "pathSOL",
        protocol: "Pathfinders",
        fallbackApy: 5.9,
        description: "Pathfinders community stake pool",
    },
};

// ─── Helpers ───────────────────────────────────────────────────────

/** Classify a token by its mint address and symbol */
export function classifyToken(mint: string, symbol?: string): TokenCategory {
    // Native staking synthetic entry is always yield-bearing
    if (mint === NATIVE_STAKING_MINT) return "YIELD_BEARING";

    if (IDLE_MINTS.has(mint) || (symbol && IDLE_SYMBOLS.has(symbol))) {
        return "IDLE";
    }
    if (mint in YIELD_MINTS) {
        return "YIELD_BEARING";
    }
    return "SPECULATIVE";
}

/** Get yield metadata for a mint, or null if it's not a known LST */
export function getYieldMeta(mint: string): YieldTokenMeta | null {
    return YIELD_MINTS[mint] ?? null;
}

/** All known yield-bearing mints as a flat array (handy for API queries) */
export function getAllYieldMints(): string[] {
    return Object.keys(YIELD_MINTS);
}
