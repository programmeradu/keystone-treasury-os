import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    extensionAlias: {
      ".js": [".js", ".ts", ".tsx", ".mjs"],
    },
  },
};

export default nextConfig;
