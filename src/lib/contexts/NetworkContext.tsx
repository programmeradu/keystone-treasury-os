"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { clusterApiUrl } from "@solana/web3.js";

export type NetworkType = "mainnet-beta" | "devnet";

interface NetworkContextType {
    network: NetworkType;
    endpoint: string;
    setNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Default endpoints
// Fallback to standard public RPC if no ENV is set. 
// Note: api.mainnet-beta.solana.com can be rate-limited. 
// For production, always consistently set NEXT_PUBLIC_SOLANA_RPC_URL.
const RPC_ENDPOINTS = {
    "mainnet-beta": process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    "devnet": clusterApiUrl("devnet")
};

export function NetworkProvider({ children }: { children: React.ReactNode }) {
    // Default to mainnet-beta since user is on production
    const [network, setNetwork] = useState<NetworkType>("mainnet-beta");
    const [endpoint, setEndpoint] = useState(RPC_ENDPOINTS["mainnet-beta"]);

    useEffect(() => {
        setEndpoint(RPC_ENDPOINTS[network]);
    }, [network]);

    return (
        <NetworkContext.Provider value={{ network, endpoint, setNetwork }}>
            {children}
        </NetworkContext.Provider>
    );
}

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) throw new Error("useNetwork must be used within a NetworkProvider");
    return context;
};
