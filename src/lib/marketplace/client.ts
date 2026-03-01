/**
 * KeystoneMarket TypeScript client -- On-chain app registry.
 * 80/20 revenue split + License NFT minting + Escrow-based payments.
 *
 * Loads the Anchor IDL from keystone_marketplace.json for full type safety.
 */

import { PublicKey, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
// @ts-ignore -- IDL import
import MARKETPLACE_IDL from "./keystone_marketplace.json";

// ─── Program Constants ──────────────────────────────────────────────

export const KEYSTONE_MARKETPLACE_PROGRAM_ID = new PublicKey(
  MARKETPLACE_IDL.address || "FAFVo6Sr1fmRnvcMcXU2XUrWEyzfPHoF8q5u4ZPNRLqT"
);

/** Revenue split: 80% developer, 20% protocol */
export const DEVELOPER_FEE_BPS = 8000;
export const PROTOCOL_FEE_BPS = 2000;

/** Escrow confirmation period: 3 days (in seconds) */
export const ESCROW_CONFIRMATION_SECONDS = 259200;

// ─── IDL Types (derived from the IDL) ──────────────────────────────

export interface AppRegistryData {
  developer: string;
  priceUsdc: bigint;
  developerFeeBps: number;
  ipfsCid: number[];
  isListed: boolean;
  totalPurchases: bigint;
  totalRevenue: bigint;
  escrowBalance: bigint;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface EscrowVaultData {
  appRegistry: string;
  balance: bigint;
  lastWithdrawal: bigint;
  confirmationPeriod: bigint;
}

export interface PurchaseEvent {
  appId: number[];
  buyer: string;
  developer: string;
  price: bigint;
  developerShare: bigint;
  protocolShare: bigint;
  escrowDeposit: bigint;
  timestamp: bigint;
}

// ─── PDA Derivation ────────────────────────────────────────────────

/**
 * Derive AppRegistry PDA from app_id (32 bytes)
 */
export function getAppRegistryPda(
  programId: PublicKey,
  appId: Uint8Array | number[]
): [PublicKey, number] {
  const seeds = [Buffer.from("app_registry"), Buffer.from(appId)];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Derive LicenseAuthority PDA from app_registry pubkey
 */
export function getLicenseAuthorityPda(
  programId: PublicKey,
  appRegistry: PublicKey
): [PublicKey, number] {
  const seeds = [Buffer.from("license_authority"), appRegistry.toBuffer()];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Derive EscrowVault PDA from app_registry pubkey
 */
export function getEscrowVaultPda(
  programId: PublicKey,
  appRegistry: PublicKey
): [PublicKey, number] {
  const seeds = [Buffer.from("escrow"), appRegistry.toBuffer()];
  return PublicKey.findProgramAddressSync(seeds, programId);
}

// ─── IDL Access ────────────────────────────────────────────────────

/** Get the full Anchor IDL for the marketplace program */
export function getMarketplaceIdl() {
  return MARKETPLACE_IDL;
}

/** Get all instruction names from the IDL */
export function getInstructionNames(): string[] {
  return MARKETPLACE_IDL.instructions.map((ix: any) => ix.name);
}

/** Get instruction definition by name */
export function getInstruction(name: string) {
  return MARKETPLACE_IDL.instructions.find((ix: any) => ix.name === name);
}

/** Get all error codes from the IDL */
export function getErrorCodes(): { code: number; name: string; msg: string }[] {
  return MARKETPLACE_IDL.errors;
}

// ─── Revenue Helpers ───────────────────────────────────────────────

/**
 * Calculate revenue split for a given price.
 * Returns { developerShare, protocolShare } in base units.
 */
export function calculateRevenueSplit(priceAmount: number): {
  developerShare: number;
  protocolShare: number;
} {
  const developerShare = (priceAmount * DEVELOPER_FEE_BPS) / 10000;
  const protocolShare = (priceAmount * PROTOCOL_FEE_BPS) / 10000;
  return { developerShare, protocolShare };
}

/**
 * Check if escrow withdrawal is available based on last withdrawal time.
 */
export function isEscrowWithdrawable(lastWithdrawalTimestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - lastWithdrawalTimestamp >= ESCROW_CONFIRMATION_SECONDS;
}
