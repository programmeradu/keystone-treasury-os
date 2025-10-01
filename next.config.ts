import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');
const enableVisualEdits = String(process.env.VISUAL_EDITS_ENABLED || "").toLowerCase() === "true";

const nextConfig: NextConfig = {
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
  // Remove potentially problematic outputFileTracingRoot for Netlify
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  
  // Mark @solana/spl-token as external to avoid bundling issues
  serverExternalPackages: ['@solana/spl-token'],
  
  // Enable the visual-edits component tagger loader only when explicitly requested
  ...(enableVisualEdits
    ? {
        turbopack: {
          rules: {
            "*.{jsx,tsx}": {
              loaders: [LOADER],
            },
          },
        },
      }
    : {}),
};

export default nextConfig;
