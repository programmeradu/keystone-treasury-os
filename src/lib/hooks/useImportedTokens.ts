"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "keystone_imported_tokens";

export interface ImportedToken {
    mint: string;
    symbol: string;
    name: string;
    logo?: string;
    decimals: number;
    addedAt: number; // timestamp
}

function loadFromStorage(): ImportedToken[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveToStorage(tokens: ImportedToken[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {}
}

export function useImportedTokens() {
    const [importedTokens, setImportedTokens] = useState<ImportedToken[]>([]);

    // Hydrate from localStorage on mount
    useEffect(() => {
        setImportedTokens(loadFromStorage());
    }, []);

    const addToken = useCallback((token: ImportedToken) => {
        setImportedTokens(prev => {
            // Deduplicate by mint
            if (prev.some(t => t.mint === token.mint)) return prev;
            const next = [...prev, token];
            saveToStorage(next);
            return next;
        });
    }, []);

    const removeToken = useCallback((mint: string) => {
        setImportedTokens(prev => {
            const next = prev.filter(t => t.mint !== mint);
            saveToStorage(next);
            return next;
        });
    }, []);

    const isImported = useCallback((mint: string) => {
        return importedTokens.some(t => t.mint === mint);
    }, [importedTokens]);

    const importedMints = importedTokens.map(t => t.mint);

    return { importedTokens, importedMints, addToken, removeToken, isImported };
}

/**
 * Fetches token metadata from Jupiter for a given mint address.
 * Returns null if not found.
 */
export async function fetchTokenMetadata(mint: string): Promise<Omit<ImportedToken, "addedAt"> | null> {
    try {
        const res = await fetch(`https://tokens.jup.ag/token/${mint}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !data.symbol) return null;

        return {
            mint,
            symbol: data.symbol,
            name: data.name || data.symbol,
            logo: data.logoURI || undefined,
            decimals: data.decimals ?? 9,
        };
    } catch {
        return null;
    }
}
