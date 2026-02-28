/**
 * KeystoneMarket TypeScript client — On-chain app registry.
 * 80/20 revenue split + License NFT minting.
 *
 * Use after anchor build to get IDL from target/idl/keystone_marketplace.json
 */

import { PublicKey } from "@solana/web3.js";

export const KEYSTONE_MARKETPLACE_PROGRAM_ID = new PublicKey(
  "FAFVo6Sr1fmRnvcMcXU2XUrWEyzfPHoF8q5u4ZPNRLqT"
);

export interface AppRegistryData {
  developer: string;
  priceUsdc: bigint;
  developerFeeBps: number;
  ipfsCid: number[];
  isListed: boolean;
}

export interface PurchaseEvent {
  appId: number[];
  buyer: string;
  developer: string;
  price: bigint;
  developerShare: bigint;
  protocolShare: bigint;
  timestamp: bigint;
}

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
