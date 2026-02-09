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
  // Phase 2 fields
  delegationAmount: real('delegation_amount'), // Approved delegation amount in payment token
  delegationExpiry: integer('delegation_expiry'), // When delegation expires
  lastExecutionAttempt: integer('last_execution_attempt'), // Last execution attempt timestamp
  failedAttempts: integer('failed_attempts').notNull().default(0), // Consecutive failures
  pauseReason: text('pause_reason'), // Why bot was paused
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
  // Phase 2 fields
  errorCode: text('error_code'), // Error type if failed
  retryCount: integer('retry_count').notNull().default(0), // How many retries
  jupiterRoute: text('jupiter_route'), // JSON of swap route used
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  botIdx: index('dca_executions_bot_idx').on(table.botId),
  statusIdx: index('dca_executions_status_idx').on(table.status),
  executedAtIdx: index('dca_executions_executed_at_idx').on(table.executedAt),
}));

// Agent Execution History
export const agentExecutions = sqliteTable('agent_executions', {
  id: text('id').primaryKey(), // exec_abc123xyz
  userId: text('user_id').notNull(), // User identifier (wallet address)
  walletAddress: text('wallet_address').notNull(), // User's wallet public key
  strategy: text('strategy').notNull(), // Strategy type: swap_token, rebalance_portfolio, etc.
  status: text('status').notNull(), // PENDING, RUNNING, SUCCESS, FAILED, CANCELLED
  progress: integer('progress').notNull().default(0), // 0-100

  // Input and output
  input: text('input', { mode: 'json' }).notNull(), // Input parameters
  result: text('result', { mode: 'json' }), // Execution result
  error: text('error'), // Error message if failed

  // Execution details
  estimatedGas: real('estimated_gas'), // Estimated SOL cost
  actualGas: real('actual_gas'), // Actual SOL cost
  transactionSignature: text('transaction_signature'), // Solana tx signature

  // Approval workflow
  approvalRequired: integer('approval_required', { mode: 'boolean' }).notNull().default(false),
  approvalId: text('approval_id'), // Reference to approval if needed
  approvedAt: integer('approved_at'), // When user approved

  // Metadata
  duration: integer('duration'), // Execution time in milliseconds
  retryCount: integer('retry_count').notNull().default(0),
  steps: text('steps', { mode: 'json' }), // Array of execution steps

  createdAt: integer('created_at').notNull(),
  startedAt: integer('started_at'),
  completedAt: integer('completed_at'),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('agent_executions_user_idx').on(table.userId),
  walletIdx: index('agent_executions_wallet_idx').on(table.walletAddress),
  strategyIdx: index('agent_executions_strategy_idx').on(table.strategy),
  statusIdx: index('agent_executions_status_idx').on(table.status),
  createdAtIdx: index('agent_executions_created_at_idx').on(table.createdAt),
}));

// Agent Approvals
export const agentApprovals = sqliteTable('agent_approvals', {
  id: text('id').primaryKey(), // approval_abc123xyz
  executionId: text('execution_id').notNull().references(() => agentExecutions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  walletAddress: text('wallet_address').notNull(),

  // Approval details
  message: text('message').notNull(), // What user is approving
  details: text('details', { mode: 'json' }), // Transaction details
  estimatedFee: real('estimated_fee'), // Estimated fee in SOL
  riskLevel: text('risk_level'), // low, medium, high

  // Response
  approved: integer('approved', { mode: 'boolean' }), // null = pending, true = approved, false = rejected
  signature: text('signature'), // User's signature
  rejectionReason: text('rejection_reason'),

  // Metadata
  expiresAt: integer('expires_at').notNull(), // Approval expires
  respondedAt: integer('responded_at'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  executionIdx: index('agent_approvals_execution_idx').on(table.executionId),
  userIdx: index('agent_approvals_user_idx').on(table.userId),
  expiresAtIdx: index('agent_approvals_expires_at_idx').on(table.expiresAt),
}));

// Marketplace Tables

export const miniApps = sqliteTable('mini_apps', {
  id: text('id').primaryKey(), // app_abc123
  name: text('name').notNull(),
  description: text('description').notNull(),
  code: text('code', { mode: 'json' }).notNull(), // { files: { ... } }
  contractCode: text('contract_code'), // Anchor/Rust source
  programId: text('program_id'), // Deployed program address
  version: text('version').notNull().default("1.0.0"),
 
  // Creator
  creatorWallet: text('creator_wallet').notNull(),
  creatorShare: real('creator_share').notNull().default(0.8), // 80%
 
  // Marketplace
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  priceUsdc: real('price_usdc').notNull().default(0),
  category: text('category').notNull().default("utility"),
  tags: text('tags', { mode: 'json' }), // Array of strings
 
  // Hybrid Storage [OPUS Phase 3.1]
  codeHash: text('code_hash'),           // SHA-256 of the source bundle for integrity
  arweaveTxId: text('arweave_tx_id'),    // Arweave transaction ID for immutable cold storage
  manifest: text('manifest', { mode: 'json' }), // keystone.manifest.json { allowedDomains, permissions, etc. }
 
  // Security [OPUS Phase 2]
  securityScore: integer('security_score'), // 0-100 from 5-stage scan pipeline
  lastScanAt: integer('last_scan_at'),      // Timestamp of last security scan
 
  // Stats
  installs: integer('installs').notNull().default(0),
  rating: real('rating'), // Average rating
 
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  creatorIdx: index('mini_apps_creator_idx').on(table.creatorWallet),
  categoryIdx: index('mini_apps_category_idx').on(table.category),
  isPublishedIdx: index('mini_apps_is_published_idx').on(table.isPublished),
}));

// User-installed apps with dock ordering [OPUS Phase 3.1]
export const userInstalledApps = sqliteTable('user_installed_apps', {
  id: text('id').primaryKey(), // install_abc123
  userId: text('user_id').notNull(),
  appId: text('app_id').notNull().references(() => miniApps.id, { onDelete: 'cascade' }),
  installedAt: integer('installed_at').notNull(),
  uninstalledAt: integer('uninstalled_at'), // null = currently installed
  dockOrder: integer('dock_order').notNull().default(0), // Position in user's dock
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  lastOpenedAt: integer('last_opened_at'),
  settings: text('settings', { mode: 'json' }), // Per-user app settings
}, (table) => ({
  userIdx: index('user_installed_apps_user_idx').on(table.userId),
  appIdx: index('user_installed_apps_app_idx').on(table.appId),
  userAppIdx: index('user_installed_apps_user_app_idx').on(table.userId, table.appId),
}));

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => miniApps.id, { onDelete: 'cascade' }),
  reviewerWallet: text('reviewer_wallet').notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  signature: text('signature').notNull(), // Wallet signature for authenticity
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  appIdx: index('reviews_app_idx').on(table.appId),
  reviewerIdx: index('reviews_reviewer_idx').on(table.reviewerWallet),
}));

export const purchases = sqliteTable('purchases', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => miniApps.id),
  buyerWallet: text('buyer_wallet').notNull(),
  txSignature: text('tx_signature').notNull(), // On-chain transaction
  amountUsdc: real('amount_usdc').notNull(),
  creatorPayout: real('creator_payout').notNull(),
  keystoneFee: real('keystone_fee').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  appIdx: index('purchases_app_idx').on(table.appId),
  buyerIdx: index('purchases_buyer_idx').on(table.buyerWallet),
}));