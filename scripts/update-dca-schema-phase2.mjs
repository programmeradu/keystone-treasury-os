import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function updateDCASchema() {
  console.log('🚀 Updating DCA bot schema for Phase 2...');
  
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.error('❌ Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
  }
  
  console.log('📡 Connecting to database...');
  const client = createClient({ url, authToken });
  
  try {
    // Add Phase 2 columns to dca_bots
    console.log('\n📦 Adding Phase 2 columns to dca_bots...');
    
    await client.execute(`
      ALTER TABLE dca_bots ADD COLUMN delegation_amount REAL
    `).catch(() => console.log('   ℹ️  delegation_amount column already exists'));
    
    await client.execute(`
      ALTER TABLE dca_bots ADD COLUMN delegation_expiry INTEGER
    `).catch(() => console.log('   ℹ️  delegation_expiry column already exists'));
    
    await client.execute(`
      ALTER TABLE dca_bots ADD COLUMN last_execution_attempt INTEGER
    `).catch(() => console.log('   ℹ️  last_execution_attempt column already exists'));
    
    await client.execute(`
      ALTER TABLE dca_bots ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0
    `).catch(() => console.log('   ℹ️  failed_attempts column already exists'));
    
    await client.execute(`
      ALTER TABLE dca_bots ADD COLUMN pause_reason TEXT
    `).catch(() => console.log('   ℹ️  pause_reason column already exists'));
    
    // Add Phase 2 columns to dca_executions
    console.log('\n📦 Adding Phase 2 columns to dca_executions...');
    
    await client.execute(`
      ALTER TABLE dca_executions ADD COLUMN error_code TEXT
    `).catch(() => console.log('   ℹ️  error_code column already exists'));
    
    await client.execute(`
      ALTER TABLE dca_executions ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0
    `).catch(() => console.log('   ℹ️  retry_count column already exists'));
    
    await client.execute(`
      ALTER TABLE dca_executions ADD COLUMN jupiter_route TEXT
    `).catch(() => console.log('   ℹ️  jupiter_route column already exists'));
    
    console.log('\n✅ Phase 2 schema update complete!');
    console.log('');
    console.log('Added to dca_bots:');
    console.log('  - delegation_amount (REAL)');
    console.log('  - delegation_expiry (INTEGER)');
    console.log('  - last_execution_attempt (INTEGER)');
    console.log('  - failed_attempts (INTEGER, default 0)');
    console.log('  - pause_reason (TEXT)');
    console.log('');
    console.log('Added to dca_executions:');
    console.log('  - error_code (TEXT)');
    console.log('  - retry_count (INTEGER, default 0)');
    console.log('  - jupiter_route (TEXT)');
    
  } catch (error) {
    console.error('❌ Failed to update schema:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

updateDCASchema();
