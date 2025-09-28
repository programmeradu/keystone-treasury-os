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
  const rawEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";
  const endpoint = /^https?:\/\//.test(rawEndpoint) ? rawEndpoint : "https://api.mainnet-beta.solana.com";
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