import { useState, useEffect, useCallback } from "react";

export interface UseTokenPriceResult {
    price: number | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

// Default price map for common tokens (used as fallback/demo)
const DEFAULT_PRICES: Record<string, number> = {
    So11111111111111111111111111111111111111112: 23.4,
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 1.0,
    DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 0.000024,
    JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 1.12,
    mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 26.8,
};

/**
 * Hook to get the current price of a token by mint address.
 * Uses Jupiter Price API in production, falls back to defaults in dev.
 */
export function useTokenPrice(mint: string): UseTokenPriceResult {
    const [price, setPrice] = useState<number | null>(DEFAULT_PRICES[mint] ?? null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(() => {
        if (!mint) return;
        setLoading(true);
        setError(null);

        fetch(`https://api.jup.ag/price/v2?ids=${mint}`)
            .then((r) => r.json())
            .then((data) => {
                const p = data?.data?.[mint]?.price;
                if (p) setPrice(Number(p));
                else setPrice(DEFAULT_PRICES[mint] ?? 0);
            })
            .catch((e) => {
                setError(e.message);
                setPrice(DEFAULT_PRICES[mint] ?? 0);
            })
            .finally(() => setLoading(false));
    }, [mint]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { price, loading, error, refetch };
}
