import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

const nextConfig: NextConfig = {
  // Allow deploys to proceed even if there are ESLint warnings/errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow deploys to proceed even if there are TypeScript type errors
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  webpack: (config) => {
    // Avoid bundling optional CLI-only pretty printer pulled in by pino via walletconnect logger
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false as unknown as string,
    };
    return config;
  },
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  }
};

export default nextConfig;
// Orchids restart: 1759075365097
