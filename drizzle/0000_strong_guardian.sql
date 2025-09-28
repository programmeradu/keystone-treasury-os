CREATE TABLE `runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`short_id` text NOT NULL,
	`prompt` text NOT NULL,
	`plan_result` text NOT NULL,
	`tool_result` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`user_id` integer,
	`run_label` text,
	`meta` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runs_short_id_unique` ON `runs` (`short_id`);