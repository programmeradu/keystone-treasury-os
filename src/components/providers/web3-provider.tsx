"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, base, arbitrum, polygon, bsc } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";
// RainbowKit
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { LiveblocksProvider } from "@liveblocks/react";
// Solana Wallet Adapter
import { WalletProvider, ConnectionProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { TorusWalletAdapter } from "@solana/wallet-adapter-torus";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useMemo, useCallback } from "react";
import { VaultProvider } from "@/lib/contexts/VaultContext";
import { NetworkProvider, useNetwork } from "@/lib/contexts/NetworkContext";
import { WalletError } from "@solana/wallet-adapter-base";
import { toast } from "@/lib/toast-notifications";



const chains = [mainnet, base, arbitrum, polygon, bsc] as const;
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const fallbackConfig = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [bsc.id]: http(),
  },
});

const rainbowConfig = projectId
  ? getDefaultConfig({
    appName: "KeyStone",
    projectId,
    chains,
    ssr: true,
  })
  : fallbackConfig;

const queryClient = new QueryClient();

// Use CSS variables from our design system so RainbowKit matches light/dark automatically
const rkTheme = lightTheme({
  accentColor: "var(--primary)",
  accentColorForeground: "var(--primary-foreground)",
  borderRadius: "small",
  overlayBlur: "small",
});

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <NetworkProvider>
      <Web3ProvidersContent>{children}</Web3ProvidersContent>
    </NetworkProvider>
  );
}

function Web3ProvidersContent({ children }: { children: ReactNode }) {
  const { endpoint } = useNetwork();
  const apiKey = process.env.NEXT_PUBLIC_CDP_API_KEY;

  // Memoize wallet adapters to prevent re-instantiation on every render
  const solanaWallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new BackpackWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
  ], []);

  // Surface wallet errors to the user
  const onWalletError = useCallback((error: WalletError) => {
    console.error("[Wallet Error]", error);
    toast.error(error.message || "Wallet connection failed", {
      description: "Please try again or use a different wallet.",
    });
  }, []);

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={solanaWallets} autoConnect onError={onWalletError}>
          <WalletModalProvider>
            <VaultProvider>
              <WagmiProvider config={rainbowConfig}>
                <QueryClientProvider client={queryClient}>
                  {projectId ? (
                    <RainbowKitProvider theme={rkTheme} modalSize="compact">
                      {apiKey ? (
                        <OnchainKitProvider apiKey={apiKey} chain={base}>{children}</OnchainKitProvider>
                      ) : (
                        children
                      )}
                    </RainbowKitProvider>
                  ) : (
                    <>
                      {apiKey ? (
                        <OnchainKitProvider apiKey={apiKey} chain={base}>{children}</OnchainKitProvider>
                      ) : (
                        children
                      )}
                    </>
                  )}
                </QueryClientProvider>
              </WagmiProvider>
            </VaultProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </LiveblocksProvider>
  );
}