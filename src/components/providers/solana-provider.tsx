"use client";

import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  // BackpackWalletAdapter, // removed - not exported in current version
  LedgerWalletAdapter,
  // BraveWalletAdapter, // removed - not exported in current version
} from "@solana/wallet-adapter-wallets";
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
    return process.env.NEXT_PUBLIC_SITE_URL 
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/solana/rpc`
      : "http://localhost:3000/api/solana/rpc";
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // new BackpackWalletAdapter(), // removed
      // new BraveWalletAdapter(), // removed
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