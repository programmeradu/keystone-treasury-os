// Replace with a minimal Server Component that renders the client subcomponent
import type { Metadata } from "next";
import { HomeClient } from "@/components/home/home-client";

export const metadata: Metadata = {
  title: "AI Treasury Operating System for Web3",
  description:
    "Non-custodial treasury workspace: natural-language intent, simulation before you sign, Solana-native intelligence.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <HomeClient />;
}