import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyTables() {
  console.log('🔍 Verifying DCA bot tables...');
  
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.error('❌ Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
  }
  
  const client = createClient({ url, authToken });
  
  try {
    // Check dca_bots table
    console.log('\n📋 Checking dca_bots table...');
    const bots = await client.execute('SELECT COUNT(*) as count FROM dca_bots');
    console.log(`   ✅ dca_bots table exists (${bots.rows[0].count} rows)`);
    
    // Check dca_executions table
    console.log('\n📋 Checking dca_executions table...');
    const executions = await client.execute('SELECT COUNT(*) as count FROM dca_executions');
    console.log(`   ✅ dca_executions table exists (${executions.rows[0].count} rows)`);
    
    // List all tables
    console.log('\n📚 All tables in database:');
    const tables = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    tables.rows.forEach(row => {
      console.log(`   - ${row.name}`);
    });
    
    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

verifyTables();
