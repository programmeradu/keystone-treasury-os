CREATE TABLE "agent_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"message" text NOT NULL,
	"details" jsonb,
	"estimated_fee" numeric(18, 9),
	"risk_level" text,
	"approved" boolean,
	"signature" text,
	"rejection_reason" text,
	"expires_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"strategy" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"estimated_gas" numeric(18, 9),
	"actual_gas" numeric(18, 9),
	"transaction_signature" text,
	"approval_required" boolean DEFAULT false NOT NULL,
	"approval_id" text,
	"approved_at" timestamp,
	"duration" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"steps" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airdrop_claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"wallet_address" text NOT NULL,
	"protocol_name" text NOT NULL,
	"protocol_slug" text NOT NULL,
	"token_symbol" text,
	"token_mint" text,
	"estimated_value" numeric(18, 6),
	"status" text DEFAULT 'eligible' NOT NULL,
	"eligibility_checked" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp,
	"claim_tx_signature" text,
	"deadline" timestamp,
	"source" text NOT NULL,
	"source_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"condition_type" text DEFAULT 'gas_below_usd_per_100k' NOT NULL,
	"threshold_usd" numeric(18, 6) NOT NULL,
	"min_gas_units" integer DEFAULT 100000 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verify_token" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_verify_token_unique" UNIQUE("verify_token")
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"total_value_usd" numeric(18, 6) NOT NULL,
	"sol_balance" numeric(18, 9) NOT NULL,
	"token_balances" jsonb NOT NULL,
	"defi_positions" jsonb,
	"yield_earned" numeric(18, 6),
	"pnl_24h" numeric(18, 6),
	"pnl_7d" numeric(18, 6),
	"pnl_30d" numeric(18, 6),
	"snapshot_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atlas_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"user_id" uuid,
	"conversation_history" jsonb DEFAULT '[]' NOT NULL,
	"last_query" text,
	"context" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dca_bots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"buy_token_mint" text NOT NULL,
	"buy_token_symbol" text NOT NULL,
	"payment_token_mint" text NOT NULL,
	"payment_token_symbol" text NOT NULL,
	"amount_usd" numeric(18, 6) NOT NULL,
	"frequency" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"max_slippage" numeric(6, 4) DEFAULT '0.5' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"wallet_address" text NOT NULL,
	"next_execution" timestamp,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"total_invested" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_received" numeric(18, 6) DEFAULT '0' NOT NULL,
	"delegation_amount" numeric(18, 6),
	"delegation_expiry" timestamp,
	"last_execution_attempt" timestamp,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"pause_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dca_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"payment_amount" numeric(18, 6) NOT NULL,
	"received_amount" numeric(18, 6) NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"slippage" numeric(6, 4) NOT NULL,
	"tx_signature" text,
	"gas_used" numeric(18, 9) NOT NULL,
	"status" text NOT NULL,
	"error_message" text,
	"jupiter_quote_id" text,
	"error_code" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"jupiter_route" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foresight_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"wallet_address" text,
	"prediction_type" text NOT NULL,
	"target_asset" text,
	"target_mint" text,
	"timeframe_hours" integer NOT NULL,
	"predicted_value" numeric(18, 6),
	"actual_value" numeric(18, 6),
	"confidence" numeric(5, 4) NOT NULL,
	"direction" text,
	"model_version" text DEFAULT 'v1' NOT NULL,
	"reasoning" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"correct" boolean,
	"resolved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"title" text,
	"summary" text,
	"content" text,
	"content_type" text DEFAULT 'markdown' NOT NULL,
	"tags" jsonb,
	"user_id" uuid,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learn_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learn_inputs" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"intent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learn_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"score" numeric(10, 4) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learn_keywords_keyword_unique" UNIQUE("keyword")
);
--> statement-breakpoint
CREATE TABLE "learn_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"weight" numeric(10, 4) NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learn_suggestions_text_unique" UNIQUE("text")
);
--> statement-breakpoint
CREATE TABLE "mini_apps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"code" jsonb NOT NULL,
	"contract_code" text,
	"program_id" text,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"creator_id" uuid,
	"creator_wallet" text NOT NULL,
	"creator_share" numeric(4, 2) DEFAULT '0.80' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"price_usdc" numeric(18, 6) DEFAULT '0' NOT NULL,
	"category" text DEFAULT 'utility' NOT NULL,
	"tags" jsonb,
	"code_hash" text,
	"arweave_tx_id" text,
	"manifest" jsonb,
	"screenshot_url" text,
	"security_score" integer,
	"last_scan_at" timestamp,
	"installs" integer DEFAULT 0 NOT NULL,
	"rating" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"action_url" text,
	"action_label" text,
	"related_entity_type" text,
	"related_entity_id" text,
	"metadata" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"buyer_id" uuid,
	"buyer_wallet" text NOT NULL,
	"tx_signature" text NOT NULL,
	"amount_usdc" numeric(18, 6) NOT NULL,
	"creator_payout" numeric(18, 6) NOT NULL,
	"keystone_fee" numeric(18, 6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"identifier_type" text NOT NULL,
	"resource" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_size" text DEFAULT 'day' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_request_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"reviewer_id" uuid,
	"reviewer_wallet" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"signature" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"short_id" text NOT NULL,
	"prompt" text NOT NULL,
	"plan_result" jsonb NOT NULL,
	"tool_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid,
	"run_label" text,
	"meta" jsonb,
	CONSTRAINT "runs_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "team_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"wallet_address" text NOT NULL,
	"vault_address" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"description" text NOT NULL,
	"details" jsonb,
	"tx_signature" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"wallet_address" text NOT NULL,
	"signature" text NOT NULL,
	"block_time" timestamp,
	"slot" integer,
	"success" boolean NOT NULL,
	"type" text,
	"direction" text,
	"from_address" text,
	"to_address" text,
	"amount" numeric(18, 9),
	"token_mint" text,
	"token_symbol" text,
	"value_usd" numeric(18, 6),
	"fee" numeric(18, 9),
	"program_id" text,
	"memo" text,
	"raw_data" jsonb,
	"tax_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_cache_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "user_installed_apps" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"app_id" text NOT NULL,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"uninstalled_at" timestamp,
	"dock_order" integer DEFAULT 0 NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"last_opened_at" timestamp,
	"settings" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" text DEFAULT 'dark' NOT NULL,
	"network" text DEFAULT 'mainnet-beta' NOT NULL,
	"rpc_endpoint" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"email_alerts" boolean DEFAULT false NOT NULL,
	"push_alerts" boolean DEFAULT false NOT NULL,
	"slippage_tolerance" numeric(6, 4) DEFAULT '0.5' NOT NULL,
	"auto_approve_below" numeric(18, 6),
	"default_vault_address" text,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"tier_expires_at" timestamp,
	"supabase_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_supabase_user_id_unique" UNIQUE("supabase_user_id")
);
--> statement-breakpoint
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_execution_id_agent_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."agent_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_approvals" ADD CONSTRAINT "agent_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airdrop_claims" ADD CONSTRAINT "airdrop_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atlas_sessions" ADD CONSTRAINT "atlas_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dca_bots" ADD CONSTRAINT "dca_bots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dca_executions" ADD CONSTRAINT "dca_executions_bot_id_dca_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."dca_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foresight_predictions" ADD CONSTRAINT "foresight_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mini_apps" ADD CONSTRAINT "mini_apps_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_app_id_mini_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."mini_apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_app_id_mini_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."mini_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_activity_log" ADD CONSTRAINT "team_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_cache" ADD CONSTRAINT "transaction_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_installed_apps" ADD CONSTRAINT "user_installed_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_installed_apps" ADD CONSTRAINT "user_installed_apps_app_id_mini_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."mini_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_approvals_execution_idx" ON "agent_approvals" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "agent_approvals_user_idx" ON "agent_approvals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_approvals_expires_at_idx" ON "agent_approvals" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "agent_executions_user_idx" ON "agent_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_executions_wallet_idx" ON "agent_executions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "agent_executions_strategy_idx" ON "agent_executions" USING btree ("strategy");--> statement-breakpoint
CREATE INDEX "agent_executions_status_idx" ON "agent_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_executions_created_at_idx" ON "agent_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "airdrop_claims_wallet_idx" ON "airdrop_claims" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "airdrop_claims_status_idx" ON "airdrop_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "airdrop_claims_protocol_idx" ON "airdrop_claims" USING btree ("protocol_slug");--> statement-breakpoint
CREATE INDEX "airdrop_claims_deadline_idx" ON "airdrop_claims" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "alerts_email_idx" ON "alerts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "alerts_active_idx" ON "alerts" USING btree ("active");--> statement-breakpoint
CREATE INDEX "alerts_verified_idx" ON "alerts" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_user_idx" ON "analytics_snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_wallet_idx" ON "analytics_snapshots" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "analytics_snapshots_at_idx" ON "analytics_snapshots" USING btree ("snapshot_at");--> statement-breakpoint
CREATE INDEX "atlas_sessions_wallet_idx" ON "atlas_sessions" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "atlas_sessions_user_idx" ON "atlas_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "atlas_sessions_expires_idx" ON "atlas_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "dca_bots_user_idx" ON "dca_bots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dca_bots_wallet_idx" ON "dca_bots" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "dca_bots_status_idx" ON "dca_bots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dca_bots_next_execution_idx" ON "dca_bots" USING btree ("next_execution");--> statement-breakpoint
CREATE INDEX "dca_executions_bot_idx" ON "dca_executions" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "dca_executions_status_idx" ON "dca_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dca_executions_executed_at_idx" ON "dca_executions" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "foresight_predictions_user_idx" ON "foresight_predictions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "foresight_predictions_type_idx" ON "foresight_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "foresight_predictions_asset_idx" ON "foresight_predictions" USING btree ("target_asset");--> statement-breakpoint
CREATE INDEX "foresight_predictions_resolved_idx" ON "foresight_predictions" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "foresight_predictions_created_at_idx" ON "foresight_predictions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "knowledge_entries_source_idx" ON "knowledge_entries" USING btree ("source");--> statement-breakpoint
CREATE INDEX "knowledge_entries_source_url_idx" ON "knowledge_entries" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "knowledge_entries_user_idx" ON "knowledge_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "knowledge_entries_created_at_idx" ON "knowledge_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mini_apps_creator_idx" ON "mini_apps" USING btree ("creator_wallet");--> statement-breakpoint
CREATE INDEX "mini_apps_creator_id_idx" ON "mini_apps" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "mini_apps_category_idx" ON "mini_apps" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mini_apps_is_published_idx" ON "mini_apps" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("read");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "purchases_app_idx" ON "purchases" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "purchases_buyer_idx" ON "purchases" USING btree ("buyer_wallet");--> statement-breakpoint
CREATE INDEX "rate_limits_id_resource_idx" ON "rate_limits" USING btree ("identifier","resource","window_start");--> statement-breakpoint
CREATE INDEX "rate_limits_resource_idx" ON "rate_limits" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "reviews_app_idx" ON "reviews" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_idx" ON "reviews" USING btree ("reviewer_wallet");--> statement-breakpoint
CREATE INDEX "team_activity_vault_idx" ON "team_activity_log" USING btree ("vault_address");--> statement-breakpoint
CREATE INDEX "team_activity_user_idx" ON "team_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_activity_action_idx" ON "team_activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "team_activity_created_at_idx" ON "team_activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tx_cache_wallet_idx" ON "transaction_cache" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "tx_cache_signature_idx" ON "transaction_cache" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "tx_cache_block_time_idx" ON "transaction_cache" USING btree ("block_time");--> statement-breakpoint
CREATE INDEX "tx_cache_type_idx" ON "transaction_cache" USING btree ("type");--> statement-breakpoint
CREATE INDEX "tx_cache_tax_category_idx" ON "transaction_cache" USING btree ("tax_category");--> statement-breakpoint
CREATE INDEX "user_installed_apps_user_idx" ON "user_installed_apps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_installed_apps_app_idx" ON "user_installed_apps" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "user_installed_apps_user_app_idx" ON "user_installed_apps" USING btree ("user_id","app_id");--> statement-breakpoint
CREATE INDEX "user_settings_user_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_wallet_idx" ON "users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "users_supabase_idx" ON "users" USING btree ("supabase_user_id");--> statement-breakpoint
CREATE INDEX "users_tier_idx" ON "users" USING btree ("tier");