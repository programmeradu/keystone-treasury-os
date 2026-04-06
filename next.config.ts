import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // allowedDevOrigins: ['192.168.227.1:3000'],
  },
  webpack: (config, { isServer }) => {
    // Disable persistent cache when disk is constrained (e.g. Vercel build)
    if (process.env.NEXT_DISABLE_WEBPACK_CACHE) {
      config.cache = false;
    }
    if (!isServer && process.env.VISUAL_EDITS_ENABLED) {
      // Disabled to prevent restart loop - enable only when needed
      // config.module.rules.push({
      //   test: /\.(jsx?|tsx?)$/,
      //   exclude: /node_modules/,
      //   use: [{ loader: "./component-tagger-loader.js" }],
      // });
    }
    return config;
  },
};

export default nextConfig;