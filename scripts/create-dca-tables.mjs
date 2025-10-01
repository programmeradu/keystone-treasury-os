import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function createDCATables() {
  console.log('🚀 Creating DCA bot tables...');
  
  const url = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  
  if (!url || !authToken) {
    console.error('❌ Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN');
    process.exit(1);
  }
  
  console.log('📡 Connecting to database...');
  const client = createClient({ url, authToken });
  
  try {
    // Create dca_bots table
    console.log('📦 Creating dca_bots table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS dca_bots (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        name text NOT NULL,
        buy_token_mint text NOT NULL,
        buy_token_symbol text NOT NULL,
        payment_token_mint text NOT NULL,
        payment_token_symbol text NOT NULL,
        amount_usd real NOT NULL,
        frequency text NOT NULL,
        start_date integer NOT NULL,
        end_date integer,
        max_slippage real DEFAULT 0.5 NOT NULL,
        status text DEFAULT 'active' NOT NULL,
        wallet_address text NOT NULL,
        next_execution integer,
        execution_count integer DEFAULT 0 NOT NULL,
        total_invested real DEFAULT 0 NOT NULL,
        total_received real DEFAULT 0 NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    
    // Create indexes for dca_bots
    console.log('📦 Creating indexes for dca_bots...');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_bots_user_idx ON dca_bots (user_id)');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_bots_wallet_idx ON dca_bots (wallet_address)');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_bots_status_idx ON dca_bots (status)');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_bots_next_execution_idx ON dca_bots (next_execution)');
    
    // Create dca_executions table
    console.log('📦 Creating dca_executions table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS dca_executions (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        bot_id text NOT NULL,
        executed_at integer NOT NULL,
        payment_amount real NOT NULL,
        received_amount real NOT NULL,
        price real NOT NULL,
        slippage real NOT NULL,
        tx_signature text,
        gas_used real NOT NULL,
        status text NOT NULL,
        error_message text,
        jupiter_quote_id text,
        created_at integer NOT NULL,
        FOREIGN KEY (bot_id) REFERENCES dca_bots(id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes for dca_executions
    console.log('📦 Creating indexes for dca_executions...');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_executions_bot_idx ON dca_executions (bot_id)');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_executions_status_idx ON dca_executions (status)');
    await client.execute('CREATE INDEX IF NOT EXISTS dca_executions_executed_at_idx ON dca_executions (executed_at)');
    
    console.log('✅ DCA tables created successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - dca_bots (with 4 indexes)');
    console.log('  - dca_executions (with 3 indexes)');
    
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createDCATables();
