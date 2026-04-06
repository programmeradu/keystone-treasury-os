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
  email: text('email'),                          // optional, collected during onboarding/settings
  displayName: text('display_name'),
  avatarSeed: text('avatar_seed'),
  role: text('role').notNull().default('user'), // user | creator | admin
  tier: text('tier').notNull().default('free'), // free | mini | max
  tierExpiresAt: timestamp('tier_expires_at'), // null = never expires (free tier or lifetime)
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  organizationName: text('organization_name'),
  supabaseUserId: text('supabase_user_id').unique(), // Supabase Auth uid
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('users_wallet_idx').on(table.walletAddress),
  supabaseIdx: index('users_supabase_idx').on(table.supabaseUserId),
  tierIdx: index('users_tier_idx').on(table.tier),
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

// ─── Knowledge Memory ─────────────────────────────────────────────────
export const knowledgeEntries = pgTable('knowledge_entries', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(), // browser_research | browser_scrape | browser_screenshot | kb_study | architect | manual
  sourceUrl: text('source_url'),
  title: text('title'),
  summary: text('summary'),
  content: text('content'), // full raw content (capped at 50KB by service)
  contentType: text('content_type').notNull().default('markdown'), // markdown | json | html | screenshot_meta
  tags: jsonb('tags'), // string[]
  userId: uuid('user_id').references(() => users.id),
  expiresAt: timestamp('expires_at'), // optional TTL
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('knowledge_entries_source_idx').on(table.source),
  sourceUrlIdx: index('knowledge_entries_source_url_idx').on(table.sourceUrl),
  userIdx: index('knowledge_entries_user_idx').on(table.userId),
  createdAtIdx: index('knowledge_entries_created_at_idx').on(table.createdAt),
}));

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
  encryptedKeypair: text('encrypted_keypair'), // AES-256-GCM encrypted delegate keypair (per-bot)
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
  status: text('status').notNull(), // PENDING, PLANNING, SIMULATING, SUCCESS, FAILED, CANCELLED
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

// ─── User Settings ────────────────────────────────────────────────────
export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  theme: text('theme').notNull().default('dark'), // dark | light | system
  network: text('network').notNull().default('mainnet-beta'), // mainnet-beta | devnet | testnet
  rpcEndpoint: text('rpc_endpoint'), // custom RPC URL
  currency: text('currency').notNull().default('USD'),
  language: text('language').notNull().default('en'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  emailAlerts: boolean('email_alerts').notNull().default(false),
  pushAlerts: boolean('push_alerts').notNull().default(false),
  slippageTolerance: numeric('slippage_tolerance', { precision: 6, scale: 4 }).notNull().default('0.5'),
  autoApproveBelow: numeric('auto_approve_below', { precision: 18, scale: 6 }), // auto-approve txns below this SOL amount
  defaultVaultAddress: text('default_vault_address'),
  preferences: jsonb('preferences'), // catch-all for future prefs
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('user_settings_user_idx').on(table.userId),
}));

// ─── Analytics Snapshots ──────────────────────────────────────────────
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  totalValueUsd: numeric('total_value_usd', { precision: 18, scale: 6 }).notNull(),
  solBalance: numeric('sol_balance', { precision: 18, scale: 9 }).notNull(),
  tokenBalances: jsonb('token_balances').notNull(), // { mint, symbol, amount, valueUsd }[]
  defiPositions: jsonb('defi_positions'), // { protocol, type, valueUsd, apy }[]
  yieldEarned: numeric('yield_earned', { precision: 18, scale: 6 }),
  pnl24h: numeric('pnl_24h', { precision: 18, scale: 6 }),
  pnl7d: numeric('pnl_7d', { precision: 18, scale: 6 }),
  pnl30d: numeric('pnl_30d', { precision: 18, scale: 6 }),
  snapshotAt: timestamp('snapshot_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('analytics_snapshots_user_idx').on(table.userId),
  walletIdx: index('analytics_snapshots_wallet_idx').on(table.walletAddress),
  snapshotAtIdx: index('analytics_snapshots_at_idx').on(table.snapshotAt),
}));

// ─── Airdrop Claims ──────────────────────────────────────────────────
export const airdropClaims = pgTable('airdrop_claims', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  walletAddress: text('wallet_address').notNull(),
  protocolName: text('protocol_name').notNull(),
  protocolSlug: text('protocol_slug').notNull(),
  tokenSymbol: text('token_symbol'),
  tokenMint: text('token_mint'),
  estimatedValue: numeric('estimated_value', { precision: 18, scale: 6 }),
  status: text('status').notNull().default('eligible'), // eligible | claimed | expired | ineligible
  eligibilityChecked: boolean('eligibility_checked').notNull().default(false),
  claimedAt: timestamp('claimed_at'),
  claimTxSignature: text('claim_tx_signature'),
  deadline: timestamp('deadline'),
  source: text('source').notNull(), // airdrops.io | manual | defi-scan
  sourceUrl: text('source_url'),
  metadata: jsonb('metadata'), // extra data from source
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('airdrop_claims_wallet_idx').on(table.walletAddress),
  statusIdx: index('airdrop_claims_status_idx').on(table.status),
  protocolIdx: index('airdrop_claims_protocol_idx').on(table.protocolSlug),
  deadlineIdx: index('airdrop_claims_deadline_idx').on(table.deadline),
}));

// ─── Foresight Predictions ───────────────────────────────────────────
export const foresightPredictions = pgTable('foresight_predictions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  walletAddress: text('wallet_address'),
  predictionType: text('prediction_type').notNull(), // price | yield | risk | market_trend
  targetAsset: text('target_asset'), // SOL, ETH, or protocol slug
  targetMint: text('target_mint'),
  timeframeHours: integer('timeframe_hours').notNull(), // 1, 4, 24, 168 (1w)
  predictedValue: numeric('predicted_value', { precision: 18, scale: 6 }),
  actualValue: numeric('actual_value', { precision: 18, scale: 6 }),
  confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull(), // 0.0000–1.0000
  direction: text('direction'), // up | down | neutral
  modelVersion: text('model_version').notNull().default('v1'),
  reasoning: text('reasoning'), // AI explanation
  resolved: boolean('resolved').notNull().default(false),
  correct: boolean('correct'), // null = unresolved
  resolvedAt: timestamp('resolved_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('foresight_predictions_user_idx').on(table.userId),
  typeIdx: index('foresight_predictions_type_idx').on(table.predictionType),
  assetIdx: index('foresight_predictions_asset_idx').on(table.targetAsset),
  resolvedIdx: index('foresight_predictions_resolved_idx').on(table.resolved),
  createdAtIdx: index('foresight_predictions_created_at_idx').on(table.createdAt),
}));

// ─── Transaction Cache ───────────────────────────────────────────────
export const transactionCache = pgTable('transaction_cache', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  walletAddress: text('wallet_address').notNull(),
  signature: text('signature').notNull().unique(),
  blockTime: timestamp('block_time'),
  slot: integer('slot'),
  success: boolean('success').notNull(),
  type: text('type'), // transfer | swap | stake | unstake | nft | program | unknown
  direction: text('direction'), // in | out | self
  fromAddress: text('from_address'),
  toAddress: text('to_address'),
  amount: numeric('amount', { precision: 18, scale: 9 }),
  tokenMint: text('token_mint'),
  tokenSymbol: text('token_symbol'),
  valueUsd: numeric('value_usd', { precision: 18, scale: 6 }),
  fee: numeric('fee', { precision: 18, scale: 9 }),
  programId: text('program_id'),
  memo: text('memo'),
  rawData: jsonb('raw_data'), // full parsed Helius data
  taxCategory: text('tax_category'), // income | capital_gain | transfer | fee
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('tx_cache_wallet_idx').on(table.walletAddress),
  signatureIdx: index('tx_cache_signature_idx').on(table.signature),
  blockTimeIdx: index('tx_cache_block_time_idx').on(table.blockTime),
  typeIdx: index('tx_cache_type_idx').on(table.type),
  taxCategoryIdx: index('tx_cache_tax_category_idx').on(table.taxCategory),
}));

// ─── Notifications ───────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // alert | dca | agent | marketplace | system | team
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull().default('info'), // info | success | warning | error
  read: boolean('read').notNull().default(false),
  readAt: timestamp('read_at'),
  actionUrl: text('action_url'), // deep link into the app
  actionLabel: text('action_label'),
  relatedEntityType: text('related_entity_type'), // dca_bot | agent_execution | mini_app | alert
  relatedEntityId: text('related_entity_id'),
  metadata: jsonb('metadata'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  readIdx: index('notifications_read_idx').on(table.read),
  typeIdx: index('notifications_type_idx').on(table.type),
  createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));

// ─── Team Activity Log ───────────────────────────────────────────────
export const teamActivityLog = pgTable('team_activity_log', {
  id: serial('id').primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  walletAddress: text('wallet_address'),
  vaultAddress: text('vault_address'),
  action: text('action').notNull(), // proposal_created | proposal_voted | proposal_executed | member_added | member_removed | settings_changed | funds_transferred | team_created | member_invited | role_changed
  targetType: text('target_type'), // proposal | member | vault | transaction
  targetId: text('target_id'),
  description: text('description'),
  details: jsonb('details'), // { proposalIndex, vote, amount, txSignature, ... }
  metadata: jsonb('metadata'), // additional context (e.g., old/new role, target user)
  txSignature: text('tx_signature'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('team_activity_team_idx').on(table.teamId),
  vaultIdx: index('team_activity_vault_idx').on(table.vaultAddress),
  userIdx: index('team_activity_user_idx').on(table.userId),
  actionIdx: index('team_activity_action_idx').on(table.action),
  createdAtIdx: index('team_activity_created_at_idx').on(table.createdAt),
}));

// ─── Rate Limits ─────────────────────────────────────────────────────
export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  identifier: text('identifier').notNull(), // walletAddress or userId
  identifierType: text('identifier_type').notNull(), // wallet | user
  resource: text('resource').notNull(), // ai_architect_runs | atlas_ai_queries | dca_bots | studio_apps | marketplace_listings | alerts | atlas_tx_lookups
  windowStart: timestamp('window_start').notNull(),
  windowSize: text('window_size').notNull().default('day'), // hour | day | month
  count: integer('count').notNull().default(0),
  lastRequestAt: timestamp('last_request_at').defaultNow().notNull(),
}, (table) => ({
  identifierResourceIdx: index('rate_limits_id_resource_idx').on(table.identifier, table.resource, table.windowStart),
  resourceIdx: index('rate_limits_resource_idx').on(table.resource),
  windowIdx: index('rate_limits_window_idx').on(table.windowStart),
}));

// ─── Monitors (price/balance/APY alerts) ─────────────────────────────
export const monitors = pgTable('monitors', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // price | balance | apy | risk
  target: text('target').notNull(), // token symbol or metric name
  operator: text('operator').notNull(), // above | below | equals | changes
  conditionValue: numeric('condition_value', { precision: 18, scale: 6 }).notNull(),
  active: boolean('active').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  lastCheckedValue: numeric('last_checked_value', { precision: 18, scale: 6 }),
  triggerCount: integer('trigger_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('monitors_wallet_idx').on(table.walletAddress),
  activeIdx: index('monitors_active_idx').on(table.active),
  typeIdx: index('monitors_type_idx').on(table.type),
}));

// ─── Atlas Sessions (wallet-based, no account required) ──────────────
export const atlasSessions = pgTable('atlas_sessions', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  userId: uuid('user_id').references(() => users.id), // null for anonymous, backfilled on SIWS login
  conversationHistory: jsonb('conversation_history').notNull().default('[]'), // { role, content, timestamp }[]
  lastQuery: text('last_query'),
  context: jsonb('context'), // cached portfolio data, token balances, etc.
  expiresAt: timestamp('expires_at').notNull(), // 24h for anonymous, 30d for Keystone subscribers
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  walletIdx: index('atlas_sessions_wallet_idx').on(table.walletAddress),
  userIdx: index('atlas_sessions_user_idx').on(table.userId),
  expiresIdx: index('atlas_sessions_expires_idx').on(table.expiresAt),
}));

// ─── Developer Tokens (CLI Auth for Marketplace Publish) ─────────────
export const developerTokens = pgTable('developer_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').notNull().unique(), // UUID bearer token
  walletAddress: text('wallet_address').notNull(), // Solana wallet (Turnkey-provisioned or BYO)
  turnkeySubOrgId: text('turnkey_sub_org_id'), // null if BYO key
  label: text('label').notNull().default('default'), // friendly name
  revoked: boolean('revoked').notNull().default(false),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('developer_tokens_token_idx').on(table.token),
  walletIdx: index('developer_tokens_wallet_idx').on(table.walletAddress),
}));

// ─── Teams ────────────────────────────────────────────────────────────
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  vaultAddress: text('vault_address'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index('teams_created_by_idx').on(table.createdBy),
}));

// ─── Team Members ─────────────────────────────────────────────────────
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  walletAddress: text('wallet_address').notNull(),
  role: text('role').notNull().default('viewer'), // owner | admin | signer | viewer
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  status: text('status').notNull().default('pending'), // pending | active | removed
}, (table) => ({
  teamIdx: index('team_members_team_idx').on(table.teamId),
  userIdx: index('team_members_user_idx').on(table.userId),
  statusIdx: index('team_members_status_idx').on(table.status),
}));

// ─── Team Invitations ─────────────────────────────────────────────────
export const teamInvitations = pgTable('team_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  invitedBy: uuid('invited_by').references(() => users.id).notNull(),
  email: text('email'),
  walletAddress: text('wallet_address'),
  role: text('role').notNull().default('viewer'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('team_invitations_team_idx').on(table.teamId),
  tokenIdx: index('team_invitations_token_idx').on(table.token),
}));


// ─── Notification Preferences ─────────────────────────────────────────
export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  teamInvites: boolean('team_invites').notNull().default(true),
  roleChanges: boolean('role_changes').notNull().default(true),
  txApprovals: boolean('tx_approvals').notNull().default(true),
  systemAlerts: boolean('system_alerts').notNull().default(true),
  tierExpiry: boolean('tier_expiry').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notification_prefs_user_idx').on(table.userId),
}));

// ─── Organizations (Workspaces) ───────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // URL-friendly identifier
  avatarUrl: text('avatar_url'),
  tier: text('tier').notNull().default('free'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('organizations_slug_idx').on(table.slug),
  createdByIdx: index('organizations_created_by_idx').on(table.createdBy),
}));

// ─── Organization Members ─────────────────────────────────────────────
export const orgMembers = pgTable('org_members', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull().default('member'), // owner | admin | member
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('org_members_org_idx').on(table.orgId),
  userIdx: index('org_members_user_idx').on(table.userId),
}));

// ─── Organization Vaults ──────────────────────────────────────────────
export const orgVaults = pgTable('org_vaults', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  vaultAddress: text('vault_address').notNull(),
  label: text('label').notNull().default('Default Vault'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('org_vaults_org_idx').on(table.orgId),
  vaultIdx: index('org_vaults_vault_idx').on(table.vaultAddress),
}));

// ─── Vaults (User-level vault registry with tier enforcement) ─────────
export const vaults = pgTable('vaults', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
  address: text('address').notNull().unique(),
  label: text('label').notNull().default('My Vault'),
  isMultisig: boolean('is_multisig').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('vaults_user_idx').on(table.userId),
  addressIdx: index('vaults_address_idx').on(table.address),
}));