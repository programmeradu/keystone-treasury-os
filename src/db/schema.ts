import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

export const runs = sqliteTable('runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shortId: text('short_id').notNull().unique(),
  prompt: text('prompt').notNull(),
  planResult: text('plan_result', { mode: 'json' }).notNull(),
  toolResult: text('tool_result', { mode: 'json' }),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  userId: integer('user_id'),
  runLabel: text('run_label'),
  meta: text('meta', { mode: 'json' }),
});

export const learnInputs = sqliteTable('learn_inputs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  intent: text('intent'),
  createdAt: integer('created_at').notNull(),
});

export const learnClicks = sqliteTable('learn_clicks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const learnKeywords = sqliteTable('learn_keywords', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  keyword: text('keyword').notNull().unique(),
  score: real('score').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const learnSuggestions = sqliteTable('learn_suggestions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull().unique(),
  weight: real('weight').notNull(),
  source: text('source').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const alerts = sqliteTable('alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  conditionType: text('condition_type').notNull().default('gas_below_usd_per_100k'),
  thresholdUsd: real('threshold_usd').notNull(),
  minGasUnits: integer('min_gas_units').notNull().default(100000),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  verifyToken: text('verify_token').unique(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  lastNotifiedAt: integer('last_notified_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  emailIdx: index('alerts_email_idx').on(table.email),
  activeIdx: index('alerts_active_idx').on(table.active),
  verifiedIdx: index('alerts_verified_idx').on(table.verified),
}));

// DCA Bot Tables
export const dcaBots = sqliteTable('dca_bots', {
  id: text('id').primaryKey(), // dca_abc123
  userId: text('user_id').notNull(), // User identifier (wallet address or user ID)
  name: text('name').notNull(),
  buyTokenMint: text('buy_token_mint').notNull(), // Token to buy (e.g., SOL mint address)
  buyTokenSymbol: text('buy_token_symbol').notNull(), // For display (e.g., "SOL")
  paymentTokenMint: text('payment_token_mint').notNull(), // Token to pay with (e.g., USDC)
  paymentTokenSymbol: text('payment_token_symbol').notNull(), // For display
  amountUsd: real('amount_usd').notNull(), // Amount in USD to spend per execution
  frequency: text('frequency').notNull(), // 'daily', 'weekly', 'biweekly', 'monthly'
  startDate: integer('start_date').notNull(), // Unix timestamp
  endDate: integer('end_date'), // Optional end date
  maxSlippage: real('max_slippage').notNull().default(0.5), // Percentage (0.5 = 0.5%)
  status: text('status').notNull().default('active'), // 'active', 'paused', 'completed', 'failed'
  walletAddress: text('wallet_address').notNull(), // User's wallet public key
  nextExecution: integer('next_execution'), // Unix timestamp for next scheduled execution
  executionCount: integer('execution_count').notNull().default(0),
  totalInvested: real('total_invested').notNull().default(0), // Total USD spent
  totalReceived: real('total_received').notNull().default(0), // Total tokens received
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('dca_bots_user_idx').on(table.userId),
  walletIdx: index('dca_bots_wallet_idx').on(table.walletAddress),
  statusIdx: index('dca_bots_status_idx').on(table.status),
  nextExecutionIdx: index('dca_bots_next_execution_idx').on(table.nextExecution),
}));

export const dcaExecutions = sqliteTable('dca_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  botId: text('bot_id').notNull().references(() => dcaBots.id, { onDelete: 'cascade' }),
  executedAt: integer('executed_at').notNull(),
  paymentAmount: real('payment_amount').notNull(), // Amount of payment token spent
  receivedAmount: real('received_amount').notNull(), // Amount of buy token received
  price: real('price').notNull(), // Execution price (payment per buy token)
  slippage: real('slippage').notNull(), // Actual slippage percentage
  txSignature: text('tx_signature'), // Solana transaction signature
  gasUsed: real('gas_used').notNull(), // SOL spent on gas
  status: text('status').notNull(), // 'success', 'failed', 'pending'
  errorMessage: text('error_message'),
  jupiterQuoteId: text('jupiter_quote_id'), // For debugging
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  botIdx: index('dca_executions_bot_idx').on(table.botId),
  statusIdx: index('dca_executions_status_idx').on(table.status),
  executedAtIdx: index('dca_executions_executed_at_idx').on(table.executedAt),
}));