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