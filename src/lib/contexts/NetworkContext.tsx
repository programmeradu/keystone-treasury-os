"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { clusterApiUrl } from "@solana/web3.js";

export type NetworkType = "mainnet-beta" | "devnet";

interface NetworkContextType {
    network: NetworkType;
    endpoint: string;
    rpcHealth: "unknown" | "ok" | "degraded" | "down";
    setNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Ordered fallback chain — first reachable endpoint wins.
// The local proxy (/api/solana/rpc) forwards to Helius server-side,
// avoiding CORS and API key exposure issues in the browser.
function getMainnetFallbacks(): string[] {
    const candidates: (string | undefined)[] = [
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
        // Local proxy — always works in dev & prod, no CORS
        typeof window !== "undefined" ? `${window.location.origin}/api/solana/rpc` : undefined,
        "https://api.mainnet-beta.solana.com",
    ];
    return candidates.filter(Boolean) as string[];
}
const MAINNET_FALLBACKS: string[] = getMainnetFallbacks();

const DEVNET_FALLBACKS: string[] = [
    clusterApiUrl("devnet"),
];

async function probeRpc(url: string, timeoutMs = 4000): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
            signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) return false;
        const json = await res.json();
        return json?.result === "ok" || json?.result != null;
    } catch {
        return false;
    }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    const [network, setNetwork] = useState<NetworkType>("mainnet-beta");
    const [endpoint, setEndpoint] = useState(MAINNET_FALLBACKS[0]);
    const [rpcHealth, setRpcHealth] = useState<"unknown" | "ok" | "degraded" | "down">("unknown");
    const probing = useRef(false);

    const selectBestEndpoint = useCallback(async (net: NetworkType) => {
        if (probing.current) return;
        probing.current = true;
        setRpcHealth("unknown");

        const candidates = net === "mainnet-beta" ? MAINNET_FALLBACKS : DEVNET_FALLBACKS;
        console.log(`[RPC] Probing ${candidates.length} endpoints for ${net}...`);

        for (const url of candidates) {
            const ok = await probeRpc(url);
            if (ok) {
                console.log(`[RPC]  Using: ${url}`);
                setEndpoint(url);
                setRpcHealth("ok");
                probing.current = false;
                return;
            }
            console.warn(`[RPC]  Unreachable: ${url}`);
        }

        // All failed — use first as fallback anyway
        console.error(`[RPC] All endpoints failed for ${net}. Using first as fallback.`);
        setEndpoint(candidates[0]);
        setRpcHealth("down");
        probing.current = false;
    }, []);

    useEffect(() => {
        selectBestEndpoint(network);
    }, [network, selectBestEndpoint]);

    return (
        <NetworkContext.Provider value={{ network, endpoint, rpcHealth, setNetwork }}>
            {children}
        </NetworkContext.Provider>
    );
}

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) throw new Error("useNetwork must be used within a NetworkProvider");
    return context;
};
