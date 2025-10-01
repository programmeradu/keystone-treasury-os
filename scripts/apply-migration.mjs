import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyMigration() {
  console.log('🚀 Starting migration...');
  
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.error('❌ Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
  }
  
  console.log('📡 Connecting to database...');
  const client = createClient({ url, authToken });
  const db = drizzle(client);
  
  try {
    console.log('📦 Applying migrations from ./drizzle folder...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

applyMigration();
