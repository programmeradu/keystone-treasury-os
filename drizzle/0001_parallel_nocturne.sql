CREATE TABLE `model_keywords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`score` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_keywords_keyword_unique` ON `model_keywords` (`keyword`);--> statement-breakpoint
CREATE TABLE `suggestion_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`weight` real NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suggestions_cache_text_unique` ON `suggestions_cache` (`text`);--> statement-breakpoint
CREATE TABLE `user_inputs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`intent` text,
	`created_at` integer NOT NULL
);
