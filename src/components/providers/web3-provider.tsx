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
  const apiKey = process.env.NEXT_PUBLIC_CDP_API_KEY;
  
  // Safety check for undefined values to prevent hydration mismatches
  if (typeof window === 'undefined') {
    // During SSR, return minimal structure
    return (
      <WagmiProvider config={fallbackConfig}>
        <QueryClientProvider client={queryClient}>
          {/* Only include OnchainKitProvider if we have a valid API key */}
          {apiKey ? (
            <OnchainKitProvider apiKey={apiKey} chain={base}>
              {children}
            </OnchainKitProvider>
          ) : (
            children
          )}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
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
  );
}