'use client';

// Note: Webpack/Next.js might fail to resolve the module via the 'default' export condition
// in @neondatabase/auth package.json exports. Fixed in next.config.ts extensionAlias.
import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();
