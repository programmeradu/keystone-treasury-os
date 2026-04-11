-- Migration 0001: Sync schema drift + new tables from audit fixes
-- Generated: 2026-04-06
-- Covers: users column changes, 10 new tables, new indexes

-- ─── Users table: add missing columns ────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organization_name" text;--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "avatar_url" TO "avatar_seed";--> statement-breakpoint

-- ─── Monitors (price/balance/APY alerts) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "monitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"target" text NOT NULL,
	"operator" text NOT NULL,
	"condition_value" numeric(18, 6) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"last_checked_value" numeric(18, 6),
	"trigger_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitors_wallet_idx" ON "monitors" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitors_active_idx" ON "monitors" USING btree ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitors_type_idx" ON "monitors" USING btree ("type");--> statement-breakpoint

-- ─── Developer Tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "developer_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"wallet_address" text NOT NULL,
	"turnkey_sub_org_id" text,
	"label" text DEFAULT 'default' NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "developer_tokens_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_tokens_token_idx" ON "developer_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "developer_tokens_wallet_idx" ON "developer_tokens" USING btree ("wallet_address");--> statement-breakpoint

-- ─── Teams ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"vault_address" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teams_created_by_idx" ON "teams" USING btree ("created_by");--> statement-breakpoint

-- ─── Team Members ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"invited_by" uuid,
	"invited_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_team_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_user_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_members_status_idx" ON "team_members" USING btree ("status");--> statement-breakpoint

-- ─── Team Invitations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"email" text,
	"wallet_address" text,
	"role" text DEFAULT 'viewer' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invitations_team_idx" ON "team_invitations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_invitations_token_idx" ON "team_invitations" USING btree ("token");--> statement-breakpoint

-- ─── Notification Preferences ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"team_invites" boolean DEFAULT true NOT NULL,
	"role_changes" boolean DEFAULT true NOT NULL,
	"tx_approvals" boolean DEFAULT true NOT NULL,
	"system_alerts" boolean DEFAULT true NOT NULL,
	"tier_expiry" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_prefs_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint

-- ─── Organizations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"avatar_url" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_created_by_idx" ON "organizations" USING btree ("created_by");--> statement-breakpoint

-- ─── Organization Members ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "org_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_members_org_idx" ON "org_members" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_members_user_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint

-- ─── Organization Vaults ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "org_vaults" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"vault_address" text NOT NULL,
	"label" text DEFAULT 'Default Vault' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_vaults_org_idx" ON "org_vaults" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "org_vaults_vault_idx" ON "org_vaults" USING btree ("vault_address");--> statement-breakpoint

-- ─── Vaults (user-level vault registry with tier enforcement) ────────
CREATE TABLE IF NOT EXISTS "vaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"address" text NOT NULL,
	"label" text DEFAULT 'My Vault' NOT NULL,
	"is_multisig" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vaults_address_unique" UNIQUE("address")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vaults_user_idx" ON "vaults" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vaults_address_idx" ON "vaults" USING btree ("address");--> statement-breakpoint

-- ─── Foreign keys for new tables ─────────────────────────────────────
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_vaults" ADD CONSTRAINT "org_vaults_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- ─── Users table: add missing indexes ────────────────────────────────
CREATE INDEX IF NOT EXISTS "users_tier_idx" ON "users" USING btree ("tier");
