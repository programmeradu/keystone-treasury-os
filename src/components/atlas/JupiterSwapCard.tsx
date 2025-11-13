"use client";

import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export const JupiterSwapCard = () => {
  const { setVisible } = useWalletModal();
  const walletCtx = useWallet();
  const containerId = "jupiter-integrated";
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

  useEffect(() => {
    const initJup = () => {
      if (typeof window === "undefined" || !(window as any).Jupiter) return;
      const Jupiter = (window as any).Jupiter;
      try {
        // Attempt to clean up any prior instance to avoid double-mount
        if (typeof Jupiter.destroy === "function") {
          try {Jupiter.destroy();} catch {}
        }
        Jupiter.init({
          displayMode: "integrated",
          integratedTargetId: containerId,
          endpoint,
          enableWalletPassthrough: true,
          passthroughWalletContextState: walletCtx,
          onRequestConnectWallet: () => setVisible(true),
          formProps: {
            initialInputMint: "So11111111111111111111111111111111111111112",
            initialOutputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
          },
          // Make widget blend with our card skin
          containerStyles: {
            background: "transparent",
            boxShadow: "none",
            borderRadius: "0px",
            height: "100%",
            padding: "0",
            margin: "0"
          },
          // Color config to keep transparent skin inside as well
          colorProps: {
            primaryColor: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#111",
            backgroundColor: "transparent",
            // Prefer the site's foreground variable, but fall back to a dark color (not white)
            primaryTextColor: getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim() || "#111",
            warningColor: "#fbbf24",
            interactiveColor: "transparent",
            moduleColor: "transparent"
          }
        });

        // Inject light-mode contrast fixes & softer sizing overrides once mounted
        try {
          const styleId = "jupiter-swap-override";
          if (!document.getElementById(styleId)) {
            const st = document.createElement("style");
            st.id = styleId;
            st.textContent = `
              /* Jupiter plugin light mode overrides */
              /* Force darker readable text in light mode */
              :root:not(.dark) #${containerId} *,
              :root:not(.dark) #${containerId} [class*="text"],
              :root:not(.dark) #${containerId} [class*="label"] { color: #0f1724 !important; }

              :root:not(.dark) #${containerId} .terminal-root,
              :root:not(.dark) #${containerId} [class*="container"],
              :root:not(.dark) #${containerId} [class*="module"],
              :root:not(.dark) #${containerId} [class*="swap"],
              :root:not(.dark) #${containerId} [class*="box"] {
                /* Slightly deepen background to improve contrast against white text */
                background: color-mix(in oklch, var(--color-card) 88%, #000 12%) !important;
              }
              #${containerId} button { border-radius: var(--radius-md) !important; font-weight:600 !important; }
              #${containerId} [class*="input"], #${containerId} input { background: color-mix(in oklch, var(--color-card) 80%, #000 20%) !important; color:#0f1724 !important }
              /* Reduce any overly white layer opacity and soften blur */
              :root:not(.dark) #${containerId} [style*="rgba(255, 255, 255"] { backdrop-filter: saturate(1.05) blur(2px); opacity:0.98 }
              /* Improve label/button contrast */
              :root:not(.dark) #${containerId} .jup-primary, :root:not(.dark) #${containerId} .jup-action { color: #ffffff !important; background: var(--primary) !important }
            `;
            document.head.appendChild(st);
          }
        } catch {}
      } catch (e) {

        // No-op; widget will simply not render
      }};

    // If already loaded, init immediately
    if ((window as any)?.Jupiter) {
      initJup();
      return;
    }

    // Otherwise inject script once
    const id = "jupiter-plugin-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://terminal.jup.ag/main-v2.js"; // Terminal is now Plugin; CDN kept for compatibility
      s.async = true;
      s.onload = initJup;
      document.body.appendChild(s);
    } else {
      // If script tag exists but window.Jupiter not ready yet, wait a tick
      const t = setTimeout(initJup, 50);
      return () => clearTimeout(t);
    }
  }, [endpoint, setVisible, walletCtx]);

  return (
    <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[300px]">
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      <CardContent className="atlas-card-content pt-0 pb-0 flex-1 flex flex-col">
        {/* Full height container for Jupiter swap widget with proper sizing */}
        <div className="flex-1 min-h-0 w-full rounded-lg overflow-hidden bg-transparent relative">
          <div id={containerId} className="bg-transparent !w-full !h-full" />
        </div>
      </CardContent>
    </Card>);

};

export default JupiterSwapCard;