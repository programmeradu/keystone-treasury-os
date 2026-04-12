CREATE TABLE IF NOT EXISTS "siws_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL
);
