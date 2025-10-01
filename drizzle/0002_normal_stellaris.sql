CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`condition_type` text DEFAULT 'gas_below_usd_per_100k' NOT NULL,
	`threshold_usd` real NOT NULL,
	`min_gas_units` integer DEFAULT 100000 NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`verify_token` text,
	`active` integer DEFAULT true NOT NULL,
	`last_notified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_verify_token_unique` ON `alerts` (`verify_token`);--> statement-breakpoint
CREATE INDEX `alerts_email_idx` ON `alerts` (`email`);--> statement-breakpoint
CREATE INDEX `alerts_active_idx` ON `alerts` (`active`);--> statement-breakpoint
CREATE INDEX `alerts_verified_idx` ON `alerts` (`verified`);--> statement-breakpoint
CREATE TABLE `dca_bots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`buy_token_mint` text NOT NULL,
	`buy_token_symbol` text NOT NULL,
	`payment_token_mint` text NOT NULL,
	`payment_token_symbol` text NOT NULL,
	`amount_usd` real NOT NULL,
	`frequency` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`max_slippage` real DEFAULT 0.5 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`wallet_address` text NOT NULL,
	`next_execution` integer,
	`execution_count` integer DEFAULT 0 NOT NULL,
	`total_invested` real DEFAULT 0 NOT NULL,
	`total_received` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `dca_bots_user_idx` ON `dca_bots` (`user_id`);--> statement-breakpoint
CREATE INDEX `dca_bots_wallet_idx` ON `dca_bots` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `dca_bots_status_idx` ON `dca_bots` (`status`);--> statement-breakpoint
CREATE INDEX `dca_bots_next_execution_idx` ON `dca_bots` (`next_execution`);--> statement-breakpoint
CREATE TABLE `dca_executions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bot_id` text NOT NULL,
	`executed_at` integer NOT NULL,
	`payment_amount` real NOT NULL,
	`received_amount` real NOT NULL,
	`price` real NOT NULL,
	`slippage` real NOT NULL,
	`tx_signature` text,
	`gas_used` real NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	`jupiter_quote_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`bot_id`) REFERENCES `dca_bots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dca_executions_bot_idx` ON `dca_executions` (`bot_id`);--> statement-breakpoint
CREATE INDEX `dca_executions_status_idx` ON `dca_executions` (`status`);--> statement-breakpoint
CREATE INDEX `dca_executions_executed_at_idx` ON `dca_executions` (`executed_at`);--> statement-breakpoint
CREATE TABLE `learn_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learn_inputs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`intent` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learn_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`score` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learn_keywords_keyword_unique` ON `learn_keywords` (`keyword`);--> statement-breakpoint
CREATE TABLE `learn_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`weight` real NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learn_suggestions_text_unique` ON `learn_suggestions` (`text`);--> statement-breakpoint
DROP TABLE `model_keywords`;--> statement-breakpoint
DROP TABLE `suggestion_clicks`;--> statement-breakpoint
DROP TABLE `suggestions_cache`;--> statement-breakpoint
DROP TABLE `user_inputs`;