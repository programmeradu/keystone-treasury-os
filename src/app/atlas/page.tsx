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

export default function SolanaAtlasPage() {
  return <AtlasClient />;
}