import { useMemo } from "react";
import { useVault } from "./useVault";

export interface PortfolioToken {
    symbol: string;
    name: string;
    balance: number;
    price: number;
    mint?: string;
    logoURI?: string;
    usdValue: number;
    percentage: number;
}

export interface PortfolioData {
    tokens: PortfolioToken[];
    totalValue: number;
    change24h: number;
    changePercent24h: number;
}

export interface UsePortfolioResult {
    data: PortfolioData | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Hook to access portfolio data with USD values, percentages, and totals.
 * Wraps useVault with computed fields for portfolio display.
 */
export function usePortfolio(): UsePortfolioResult {
    const vault = useVault();

    const data = useMemo(() => {
        const totalValue = vault.tokens.reduce(
            (sum, t) => sum + t.balance * t.price,
            0
        );

        const tokens: PortfolioToken[] = vault.tokens.map((t) => ({
            ...t,
            usdValue: t.balance * t.price,
            percentage: totalValue > 0 ? ((t.balance * t.price) / totalValue) * 100 : 0,
        }));

        return {
            tokens,
            totalValue,
            change24h: 0,
            changePercent24h: 0,
        };
    }, [vault.tokens]);

    return {
        data,
        isLoading: false,
        error: null,
        refetch: () => { },
    };
}
