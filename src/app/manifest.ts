import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dreyv — AI treasury workspace",
    short_name: "dreyv",
    description:
      "Non-custodial treasury workspace: intent, simulation, and multisig signing on Solana.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050508",
    theme_color: "#050508",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "512x512",
        purpose: "any",
      },
    ],
  };
}
