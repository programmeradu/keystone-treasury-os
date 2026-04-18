import type { Metadata } from "next";
import { Suspense } from "react";
import { SolanaProviders } from "@/components/providers/solana-provider";
import { AtlasClient } from "@/components/atlas/atlas-client";

export const metadata: Metadata = {
  title: "dreyv atlas",
  description:
    "dreyv atlas: Solana intelligence cockpit with transparent risk signals, workflow guidance, and execution-ready context.",
  alternates: { canonical: "/atlas" },
};

export const dynamic = "force-dynamic";

function AtlasLoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500 font-[Manrope,sans-serif]" role="status">
      Loading Atlas…
    </div>
  );
}

/** Suspense required: AtlasClient uses useSearchParams() */
export default function SolanaAtlasPage() {
  return (
    <div className="atlas-page-bg text-slate-800 dark:text-slate-200 antialiased h-screen overflow-hidden font-[Manrope,sans-serif]">
      <Suspense fallback={<AtlasLoadingFallback />}>
        <SolanaProviders>
          <AtlasClient />
        </SolanaProviders>
      </Suspense>
    </div>
  );
}