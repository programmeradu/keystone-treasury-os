-- Custom SQL migration file, put your code below! --
CREATE TABLE IF NOT EXISTS "siws_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "siws_nonces_created_at_idx" ON "siws_nonces" USING btree ("created_at");
