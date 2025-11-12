import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');
const enableVisualEdits = String(process.env.VISUAL_EDITS_ENABLED || "").toLowerCase() === "true";

const nextConfig: NextConfig = {
  // swcMinify is deprecated in Next.js 15; minification is always enabled.
  // Removed to silence warning. If you need to temporarily disable minification
  // for debugging, set NEXT_DISABLE_SWC_MINIFY=1 (internal) or use a custom build step.
  eslint: {
    ignoreDuringBuilds: true,
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
  // Remove potentially problematic outputFileTracingRoot for Netlify
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  
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
