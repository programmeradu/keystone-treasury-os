-- Migration 0002: Add per-bot encrypted keypair column to dca_bots
-- Generated: 2026-04-06
-- Security: Each DCA bot gets its own keypair instead of sharing a single delegate key

ALTER TABLE "dca_bots" ADD COLUMN IF NOT EXISTS "encrypted_keypair" text;
