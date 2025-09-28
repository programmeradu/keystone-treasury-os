import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

// Create client only if environment variables are available
// This prevents build-time errors when deploying to Netlify
const createDbClient = () => {
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    // Return a mock client for build-time compatibility
    return null;
  }
  
  return createClient({
    url,
    authToken,
  });
};

const client = createDbClient();
export const db = client ? drizzle(client, { schema }) : (() => { throw new Error('Database not available - missing environment variables'); })();

export type Database = typeof db;