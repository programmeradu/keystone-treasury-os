"use client";

import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaProviders({ children }: { children: ReactNode }) {
  // Use our proxy endpoint by default to avoid 403 errors from public RPC
  // Falls back to custom RPC if NEXT_PUBLIC_SOLANA_RPC is set
  const endpoint = useMemo(() => {
    const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC;
    if (customRpc && /^https?:\/\//.test(customRpc)) {
      return customRpc;
    }

    // Use our proxy endpoint (works in both dev and production)
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/solana/rpc`;
    }

    // Fallback for SSR (won't be used for connection but needed for hydration)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return `${process.env.NEXT_PUBLIC_SITE_URL}/api/solana/rpc`;
    }
    // Fallback to localhost for SSR/local development
    return "http://localhost:3000/api/solana/rpc";
  }, []);

  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "processed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}