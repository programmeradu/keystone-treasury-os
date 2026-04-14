import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dreyv — Treasury Operating System",
    short_name: "Dreyv",
    description:
      "AI-powered, non-custodial command layer for Web3 treasuries. Simulate before you sign.",
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
