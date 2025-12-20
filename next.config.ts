import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // allowedDevOrigins: ['192.168.227.1:3000'],
  },
  webpack: (config, { isServer }) => {
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