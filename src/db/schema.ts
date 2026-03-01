import {
  pgTable,
  serial,
  text,
  numeric,
  boolean,
  timestamp,
  integer,
  uuid,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';

// ─── Users (SIWS Auth — synced from Supabase Auth) ────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: text('wallet_address').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'), // user | creator | admin
  supabaseUserId: text('supabase_user_id').unique(), // Supabase Auth uid
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('users_wallet_idx').on(table.walletAddress),
  supabaseIdx: index('users_supabase_idx').on(table.supabaseUserId),
}));

// ─── AI Runs ──────────────────────────────────────────────────────────
export const runs = pgTable('runs', {
  id: serial('id').primaryKey(),
  shortId: text('short_id').notNull().unique(),
  prompt: text('prompt').notNull(),
  planResult: jsonb('plan_result').notNull(),
  toolResult: jsonb('tool_result'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userId: uuid('user_id').references(() => users.id),
  runLabel: text('run_label'),
  meta: jsonb('meta'),
});

// ─── Learn Tables ─────────────────────────────────────────────────────
export const learnInputs = pgTable('learn_inputs', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  intent: text('intent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learnClicks = pgTable('learn_clicks', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learnKeywords = pgTable('learn_keywords', {
  id: serial('id').primaryKey(),
  keyword: text('keyword').notNull().unique(),
  score: numeric('score', { precision: 10, scale: 4 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const learnSuggestions = pgTable('learn_suggestions', {
  id: serial('id').primaryKey(),
  text: text('text').notNull().unique(),
  weight: numeric('weight', { precision: 10, scale: 4 }).notNull(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Alerts ───────────────────────────────────────────────────────────
export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  conditionType: text('condition_type').notNull().default('gas_below_usd_per_100k'),
  thresholdUsd: numeric('threshold_usd', { precision: 18, scale: 6 }).notNull(),
  minGasUnits: integer('min_gas_units').notNull().default(100000),
  verified: boolean('verified').notNull().default(false),
  verifyToken: text('verify_token').unique(),
  active: boolean('active').notNull().default(true),
  lastNotifiedAt: timestamp('last_notified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('alerts_email_idx').on(table.email),
  activeIdx: index('alerts_active_idx').on(table.active),
  verifiedIdx: index('alerts_verified_idx').on(table.verified),
}));

// ─── DCA Bots ─────────────────────────────────────────────────────────
export const dcaBots = pgTable('dca_bots', {
  id: text('id').primaryKey(), // dca_abc123
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  buyTokenMint: text('buy_token_mint').notNull(),
  buyTokenSymbol: text('buy_token_symbol').notNull(),
  paymentTokenMint: text('payment_token_mint').notNull(),
  paymentTokenSymbol: text('payment_token_symbol').notNull(),
  amountUsd: numeric('amount_usd', { precision: 18, scale: 6 }).notNull(),
  frequency: text('frequency').notNull(), // daily, weekly, biweekly, monthly
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  maxSlippage: numeric('max_slippage', { precision: 6, scale: 4 }).notNull().default('0.5'),
  status: text('status').notNull().default('active'), // active, paused, completed, failed
  walletAddress: text('wallet_address').notNull(),
  nextExecution: timestamp('next_execution'),
  executionCount: integer('execution_count').notNull().default(0),
  totalInvested: numeric('total_invested', { precision: 18, scale: 6 }).notNull().default('0'),
  totalReceived: numeric('total_received', { precision: 18, scale: 6 }).notNull().default('0'),
  delegationAmount: numeric('delegation_amount', { precision: 18, scale: 6 }),
  delegationExpiry: timestamp('delegation_expiry'),
  lastExecutionAttempt: timestamp('last_execution_attempt'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  pauseReason: text('pause_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('dca_bots_user_idx').on(table.userId),
  walletIdx: index('dca_bots_wallet_idx').on(table.walletAddress),
  statusIdx: index('dca_bots_status_idx').on(table.status),
  nextExecutionIdx: index('dca_bots_next_execution_idx').on(table.nextExecution),
}));

export const dcaExecutions = pgTable('dca_executions', {
  id: serial('id').primaryKey(),
  botId: text('bot_id').notNull().references(() => dcaBots.id, { onDelete: 'cascade' }),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  paymentAmount: numeric('payment_amount', { precision: 18, scale: 6 }).notNull(),
  receivedAmount: numeric('received_amount', { precision: 18, scale: 6 }).notNull(),
  price: numeric('price', { precision: 18, scale: 6 }).notNull(),
  slippage: numeric('slippage', { precision: 6, scale: 4 }).notNull(),
  txSignature: text('tx_signature'),
  gasUsed: numeric('gas_used', { precision: 18, scale: 9 }).notNull(),
  status: text('status').notNull(), // success, failed, pending
  errorMessage: text('error_message'),
  jupiterQuoteId: text('jupiter_quote_id'),
  errorCode: text('error_code'),
  retryCount: integer('retry_count').notNull().default(0),
  jupiterRoute: jsonb('jupiter_route'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  botIdx: index('dca_executions_bot_idx').on(table.botId),
  statusIdx: index('dca_executions_status_idx').on(table.status),
  executedAtIdx: index('dca_executions_executed_at_idx').on(table.executedAt),
}));

// ─── Agent Executions ─────────────────────────────────────────────────
export const agentExecutions = pgTable('agent_executions', {
  id: text('id').primaryKey(), // exec_abc123xyz
  userId: uuid('user_id').notNull().references(() => users.id),
  walletAddress: text('wallet_address').notNull(),
  strategy: text('strategy').notNull(),
  status: text('status').notNull(), // PENDING, RUNNING, SUCCESS, FAILED, CANCELLED
  progress: integer('progress').notNull().default(0),
  input: jsonb('input').notNull(),
  result: jsonb('result'),
  error: text('error'),
  estimatedGas: numeric('estimated_gas', { precision: 18, scale: 9 }),
  actualGas: numeric('actual_gas', { precision: 18, scale: 9 }),
  transactionSignature: text('transaction_signature'),
  approvalRequired: boolean('approval_required').notNull().default(false),
  approvalId: text('approval_id'),
  approvedAt: timestamp('approved_at'),
  duration: integer('duration'),
  retryCount: integer('retry_count').notNull().default(0),
  steps: jsonb('steps'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('agent_executions_user_idx').on(table.userId),
  walletIdx: index('agent_executions_wallet_idx').on(table.walletAddress),
  strategyIdx: index('agent_executions_strategy_idx').on(table.strategy),
  statusIdx: index('agent_executions_status_idx').on(table.status),
  createdAtIdx: index('agent_executions_created_at_idx').on(table.createdAt),
}));

export const agentApprovals = pgTable('agent_approvals', {
  id: text('id').primaryKey(),
  executionId: text('execution_id').notNull().references(() => agentExecutions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  walletAddress: text('wallet_address').notNull(),
  message: text('message').notNull(),
  details: jsonb('details'),
  estimatedFee: numeric('estimated_fee', { precision: 18, scale: 9 }),
  riskLevel: text('risk_level'),
  approved: boolean('approved'),
  signature: text('signature'),
  rejectionReason: text('rejection_reason'),
  expiresAt: timestamp('expires_at').notNull(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  executionIdx: index('agent_approvals_execution_idx').on(table.executionId),
  userIdx: index('agent_approvals_user_idx').on(table.userId),
  expiresAtIdx: index('agent_approvals_expires_at_idx').on(table.expiresAt),
}));

// ─── Marketplace ──────────────────────────────────────────────────────
export const miniApps = pgTable('mini_apps', {
  id: text('id').primaryKey(), // app_abc123
  name: text('name').notNull(),
  description: text('description').notNull(),
  code: jsonb('code').notNull(), // { files: { ... } }
  contractCode: text('contract_code'),
  programId: text('program_id'),
  version: text('version').notNull().default('1.0.0'),

  // Creator
  creatorId: uuid('creator_id').references(() => users.id),
  creatorWallet: text('creator_wallet').notNull(),
  creatorShare: numeric('creator_share', { precision: 4, scale: 2 }).notNull().default('0.80'),

  // Marketplace
  isPublished: boolean('is_published').notNull().default(false),
  priceUsdc: numeric('price_usdc', { precision: 18, scale: 6 }).notNull().default('0'),
  category: text('category').notNull().default('utility'),
  tags: jsonb('tags'), // string[]

  // Hybrid Storage
  codeHash: text('code_hash'),
  arweaveTxId: text('arweave_tx_id'),
  manifest: jsonb('manifest'),
  screenshotUrl: text('screenshot_url'), // Supabase Storage URL

  // Security
  securityScore: integer('security_score'),
  lastScanAt: timestamp('last_scan_at'),

  // Stats
  installs: integer('installs').notNull().default(0),
  rating: numeric('rating', { precision: 3, scale: 2 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  creatorIdx: index('mini_apps_creator_idx').on(table.creatorWallet),
  creatorIdIdx: index('mini_apps_creator_id_idx').on(table.creatorId),
  categoryIdx: index('mini_apps_category_idx').on(table.category),
  isPublishedIdx: index('mini_apps_is_published_idx').on(table.isPublished),
}));

export const userInstalledApps = pgTable('user_installed_apps', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  appId: text('app_id').notNull().references(() => miniApps.id, { onDelete: 'cascade' }),
  installedAt: timestamp('installed_at').defaultNow().notNull(),
  uninstalledAt: timestamp('uninstalled_at'),
  dockOrder: integer('dock_order').notNull().default(0),
  pinned: boolean('pinned').notNull().default(false),
  lastOpenedAt: timestamp('last_opened_at'),
  settings: jsonb('settings'),
}, (table) => ({
  userIdx: index('user_installed_apps_user_idx').on(table.userId),
  appIdx: index('user_installed_apps_app_idx').on(table.appId),
  userAppIdx: index('user_installed_apps_user_app_idx').on(table.userId, table.appId),
}));

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => miniApps.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  reviewerWallet: text('reviewer_wallet').notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  signature: text('signature').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  appIdx: index('reviews_app_idx').on(table.appId),
  reviewerIdx: index('reviews_reviewer_idx').on(table.reviewerWallet),
}));

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => miniApps.id),
  buyerId: uuid('buyer_id').references(() => users.id),
  buyerWallet: text('buyer_wallet').notNull(),
  txSignature: text('tx_signature').notNull(),
  amountUsdc: numeric('amount_usdc', { precision: 18, scale: 6 }).notNull(),
  creatorPayout: numeric('creator_payout', { precision: 18, scale: 6 }).notNull(),
  keystoneFee: numeric('keystone_fee', { precision: 18, scale: 6 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  appIdx: index('purchases_app_idx').on(table.appId),
  buyerIdx: index('purchases_buyer_idx').on(table.buyerWallet),
}));