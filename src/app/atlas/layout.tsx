import type { Metadata } from "next";
import { Suspense } from "react";
import { SolanaProviders } from "@/components/providers/solana-provider";
import { AtlasDataProvider } from "@/hooks/use-atlas-data";

export const metadata: Metadata = {
  title: "dreyv atlas",
  description:
    "dreyv atlas: Solana intelligence cockpit with transparent risk signals, workflow guidance, and execution-ready context.",
};

function AtlasLoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500 font-manrope" role="status">
      Loading Atlas…
    </div>
  );
}

export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas-page-bg text-slate-800 antialiased h-screen overflow-hidden font-manrope">
      <Suspense fallback={<AtlasLoadingFallback />}>
        <SolanaProviders>
          <AtlasDataProvider>
            {children}
          </AtlasDataProvider>
        </SolanaProviders>
      </Suspense>
    </div>
  );
}
