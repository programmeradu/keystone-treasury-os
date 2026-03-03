'use client';

// Note: Webpack/Next.js might fail to resolve the module via the 'default' export condition
// in @neondatabase/auth package.json exports. We use a relative import or just standard import
// if we update webpack to correctly resolve exports. Wait, the error was "Module not found".
// Let's try importing from the index export instead of /next ? No, the API is different.
import { createAuthClient } from '@neondatabase/auth/next';

export const authClient = createAuthClient();
