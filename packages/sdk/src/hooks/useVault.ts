import { useMemo } from "react";
import type { VaultState } from "../types";

const DEFAULT_VAULT: VaultState = {
  activeVault: "Main Portfolio",
  balances: { SOL: 124.5, USDC: 5400.2 },
  tokens: [
    { symbol: "SOL", name: "Solana", balance: 124.5, price: 23.4 },
    { symbol: "USDC", name: "USD Coin", balance: 5400.2, price: 1.0 },
    { symbol: "BONK", name: "Bonk", balance: 15_000_000, price: 0.000024 },
    { symbol: "JUP", name: "Jupiter", balance: 850, price: 1.12 },
  ],
};

/**
 * Hook to access vault state (balances, tokens).
 * In Studio iframe, the host injects a version with live prices/logos.
 */
export function useVault(): VaultState {
  return useMemo(() => ({ ...DEFAULT_VAULT }), []);
}
