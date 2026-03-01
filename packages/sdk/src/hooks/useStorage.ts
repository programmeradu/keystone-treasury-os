import { useState, useCallback } from "react";

export interface UseStorageResult {
    get: (key: string) => string | null;
    set: (key: string, value: string) => void;
    remove: (key: string) => void;
    keys: () => string[];
    clear: () => void;
}

const STORAGE_PREFIX = "ks_app_";

/**
 * Hook for persistent key-value storage scoped to the mini-app.
 * Uses localStorage under the hood, prefixed to avoid collisions.
 * In the Studio iframe, the host may intercept and sync storage.
 */
export function useStorage(namespace?: string): UseStorageResult {
    const prefix = namespace ? `${STORAGE_PREFIX}${namespace}_` : STORAGE_PREFIX;

    // Trigger re-renders on storage changes
    const [, setTick] = useState(0);
    const bump = useCallback(() => setTick((t) => t + 1), []);

    const get = useCallback(
        (key: string): string | null => {
            try {
                return localStorage.getItem(`${prefix}${key}`);
            } catch {
                return null;
            }
        },
        [prefix]
    );

    const set = useCallback(
        (key: string, value: string) => {
            try {
                localStorage.setItem(`${prefix}${key}`, value);
                bump();
            } catch (e) {
                console.warn("[useStorage] Failed to set:", e);
            }
        },
        [prefix, bump]
    );

    const remove = useCallback(
        (key: string) => {
            try {
                localStorage.removeItem(`${prefix}${key}`);
                bump();
            } catch {
                // Ignore
            }
        },
        [prefix, bump]
    );

    const keys = useCallback((): string[] => {
        try {
            const result: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith(prefix)) {
                    result.push(k.slice(prefix.length));
                }
            }
            return result;
        } catch {
            return [];
        }
    }, [prefix]);

    const clear = useCallback(() => {
        try {
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith(prefix)) toRemove.push(k);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
            bump();
        } catch {
            // Ignore
        }
    }, [prefix, bump]);

    return { get, set, remove, keys, clear };
}
