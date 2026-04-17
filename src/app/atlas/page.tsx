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
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground" role="status">
      Loading Atlas…
    </div>
  );
}

/** Suspense required: AtlasClient uses useSearchParams() (Next.js will error or500 without a boundary in some modes). */
export default function SolanaAtlasPage() {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120rem_42rem_at_-10%_-10%,rgba(115,54,255,0.12),transparent_50%),radial-gradient(90rem_38rem_at_110%_-10%,rgba(56,189,248,0.08),transparent_50%),linear-gradient(to_bottom,rgba(15,23,42,0.02),transparent_25%)] dark:bg-[radial-gradient(120rem_42rem_at_-10%_-10%,rgba(115,54,255,0.24),transparent_50%),radial-gradient(90rem_38rem_at_110%_-10%,rgba(14,165,233,0.18),transparent_50%),linear-gradient(to_bottom,rgba(15,23,42,0.88),rgba(2,6,23,1)_28%)]" />
      <div className="relative z-10 min-h-dvh p-4 md:p-6">
        <Suspense fallback={<AtlasLoadingFallback />}>
          <SolanaProviders>
            <AtlasClient />
          </SolanaProviders>
        </Suspense>
      </div>
    </div>
  );
}