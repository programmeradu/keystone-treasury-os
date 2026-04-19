"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "@/lib/toast-notifications";

// Core tokens for prices
export const CORE_TOKENS = [
  { id: "SOL",     symbol: "SOL",     icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" },
  { id: "MSOL",    symbol: "mSOL",    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png" },
  { id: "JITOSOL", symbol: "jitoSOL", icon: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png" },
  { id: "BSOL",    symbol: "bSOL",    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png" },
  { id: "USDC",    symbol: "USDC",    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" },
  { id: "JUP",     symbol: "JUP",     icon: "https://static.jup.ag/jup/icon.png" },
  { id: "BONK",    symbol: "BONK",    icon: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I" },
  { id: "PYTH",    symbol: "PYTH",    icon: "https://pyth.network/token.svg" },
  { id: "RAY",     symbol: "RAY",     icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png" },
  { id: "ORCA",    symbol: "ORCA",    icon: "https://arweave.net/jQJRDpMM7NWRAQ3VQyr7K_Me6K6UZbOacJ62blhdsNg" },
];
export const CORE_TOKEN_IDS = CORE_TOKENS.map((t) => t.id).join(",");

// Lightweight retry/backoff helper
export async function fetchJsonWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 3, baseDelayMs = 400) {
  let lastErr: any = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(input, init);
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : await res.text();
      if (!res.ok) {
        lastErr = new Error((data as any)?.error || res.statusText || "Request failed");
      } else {
        return data;
      }
    } catch (e) {
      lastErr = e;
    }
    const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 200);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastErr;
}

type AtlasDataContextType = {
  solBalance: number | null;
  balanceError: string | null;
  prices: Record<string, number>;
  coreHistory: Record<string, number[]>;
  pricesUpdatedAt: number | null;
  pricesLoading: boolean;
  refreshPrices: () => Promise<void>;
  inflationApy: number | null;
  inflationError: string | null;
};

const AtlasDataContext = createContext<AtlasDataContextType | null>(null);

export function AtlasDataProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [coreHistory, setCoreHistory] = useState<Record<string, number[]>>({});
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<number | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [inflationApy, setInflationApy] = useState<number | null>(null);
  const [inflationError, setInflationError] = useState<string | null>(null);

  const refreshAbortRef = useRef<AbortController | null>(null);

  // Fetch wallet SOL balance
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!publicKey) {setSolBalance(null);return;}
      try {
        const bal = await connection.getBalance(publicKey as PublicKey, "processed");
        if (!abort) { setSolBalance(bal / LAMPORTS_PER_SOL); setBalanceError(null); }
      } catch (e1: any) {
        try {
          const j = await fetchJsonWithRetry("/api/solana/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getBalance", params: [publicKey!.toBase58(), { commitment: "processed" }] })
          });
          const val = (j as any)?.result?.value;
          if (!abort && typeof val === "number") {
            setSolBalance(val / LAMPORTS_PER_SOL);
            setBalanceError(null);
            return;
          }
          if (!abort) { setBalanceError(e1?.message || "Failed to fetch balance"); setSolBalance(0); }
        } catch (e2: any) {
          if (!abort) { setBalanceError(e2?.message || e1?.message || "Failed to fetch balance"); setSolBalance(0); }
        }
      }
    }
    run();
    const id = setInterval(run, 15_000);
    return () => {abort = true;clearInterval(id);};
  }, [connection, publicKey]);

  async function refreshPrices() {
    if (refreshAbortRef.current) refreshAbortRef.current.abort();
    refreshAbortRef.current = new AbortController();
    try {
      setPricesLoading(true);
      const j = await fetchJsonWithRetry(`/api/jupiter/price?ids=${CORE_TOKEN_IDS}`, { cache: "no-store", signal: refreshAbortRef.current.signal });
      if ((j as any)?.data) {
        const map: Record<string, number> = {};
        for (const k of Object.keys((j as any).data)) {
          const p = (j as any).data[k]?.price;
          if (typeof p === "number") map[k.toUpperCase()] = p;
        }
        setPrices(map);
        setCoreHistory((prev) => {
          const next = { ...prev };
          for (const t of CORE_TOKENS) {
            const p = map[t.id];
            if (typeof p === "number") next[t.id] = [...(next[t.id] || []).slice(-47), p];
          }
          return next;
        });
        setPricesUpdatedAt(Date.now());
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        toast.error("Refresh failed", { description: e?.message || String(e) });
      }
    } finally {
      setPricesLoading(false);
    }
  }

  // Poll prices
  useEffect(() => {
    let abort = false;
    async function run() {
      if (pricesLoading) return; // avoid overlapping fetching
      try {
        const j = await fetchJsonWithRetry(`/api/jupiter/price?ids=${CORE_TOKEN_IDS}`, { cache: "no-store" });
        if (!abort && (j as any)?.data) {
          const map: Record<string, number> = {};
          for (const k of Object.keys((j as any).data)) {
            const p = (j as any).data[k]?.price;
            if (typeof p === "number") map[k.toUpperCase()] = p;
          }
          setPrices(map);
          setPricesUpdatedAt(Date.now());
          setCoreHistory((prev) => {
            const next = { ...prev };
            for (const t of CORE_TOKENS) {
              const p = map[t.id];
              if (typeof p === "number") next[t.id] = [...(next[t.id] || []).slice(-47), p];
            }
            return next;
          });
        }
      } catch (_e) {}
    }
    run();
    const id = setInterval(run, 30_000);
    return () => {abort = true;clearInterval(id);};
  }, []); // Note: leaving pricesLoading out to avoid resetting interval

  // Fetch network inflation rate as staking APY baseline
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const j = await fetchJsonWithRetry("/api/solana/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getInflationRate", params: [] })
        });
        const rate = (j as any)?.result?.total;
        if (!abort && typeof rate === "number") {
          setInflationApy(Math.max(0, Math.min(20, rate * 100)));
          setInflationError(null);
        }
      } catch (e: any) {
        if (!abort) {
          setInflationError(e?.message || "Failed to fetch inflation rate");
          setInflationApy(0);
        }
      }
    }
    run();
    const id = setInterval(run, 60_000);
    return () => {abort = true;clearInterval(id);};
  }, []);

  return (
    <AtlasDataContext.Provider value={{
      solBalance, balanceError,
      prices, coreHistory, pricesUpdatedAt, pricesLoading, refreshPrices,
      inflationApy, inflationError
    }}>
      {children}
    </AtlasDataContext.Provider>
  );
}

export function useAtlasData() {
  const ctx = useContext(AtlasDataContext);
  if (!ctx) {
    throw new Error("useAtlasData must be used within an AtlasDataProvider");
  }
  return ctx;
}
