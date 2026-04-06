import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // allowedDevOrigins: ['192.168.227.1:3000'],
  },
  serverExternalPackages: ['drizzle-orm', '@neondatabase/serverless'],
  webpack: (config, { isServer }) => {
    // Disable persistent cache when disk is constrained (e.g. Vercel build)
    if (process.env.NEXT_DISABLE_WEBPACK_CACHE) {
      config.cache = false;
    }
    // Prevent drizzle-orm circular init error in client bundles.
    // Server actions use "use server" but drizzle-orm's ESM star-exports
    // can leak into client chunks and fail with TDZ errors.
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        'drizzle-orm': require.resolve('./src/lib/drizzle-client-stub.js'),
      };
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