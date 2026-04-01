/**
 * Keystone Marketplace — On-chain client for app registry + License NFT.
 *
 * Builds raw Anchor instructions without @coral-xyz/anchor dependency.
 * Program deployed at F8kN2gs4kqHtz2bkJZLbtNm6j8e7EUSarYDQcXff8iQY on devnet.
 */

import {
  PublicKey,
  Connection,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
// @ts-ignore
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, MINT_SIZE, getMinimumBalanceForRentExemptMint } from "@solana/spl-token";
// @ts-ignore
import MARKETPLACE_IDL from "./keystone_marketplace.json";

// ─── Program Constants ──────────────────────────────────────────────

export const KEYSTONE_MARKETPLACE_PROGRAM_ID = new PublicKey(
  "F8kN2gs4kqHtz2bkJZLbtNm6j8e7EUSarYDQcXff8iQY"
);

/** Devnet USDC mint */
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

/** Revenue split: 80% developer, 20% protocol */
export const DEVELOPER_FEE_BPS = 8000;
export const PROTOCOL_FEE_BPS = 2000;

// ─── Anchor Discriminator Helpers ──────────────────────────────────

/**
 * Compute Anchor instruction discriminator: sha256("global:<name>")[0..8]
 */
async function anchorDiscriminator(name: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`global:${name}`);
  // @ts-expect-error Edge runtime compatibility for Next.js build
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(new Uint8Array(hashBuffer).slice(0, 8));
}

// ─── PDA Derivation ────────────────────────────────────────────────

export function getAppRegistryPda(appId: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("app_registry"), Buffer.from(appId)],
    KEYSTONE_MARKETPLACE_PROGRAM_ID
  );
}

export function getLicenseAuthorityPda(appRegistry: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("license_authority"), appRegistry.toBuffer()],
    KEYSTONE_MARKETPLACE_PROGRAM_ID
  );
}

// ─── App ID Helpers ────────────────────────────────────────────────

/** Convert a string app ID (e.g. "app_9bb8cab1") to a 32-byte array */
export function appIdToBytes(appId: string): Uint8Array {
  const bytes = new Uint8Array(32);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(appId);
  bytes.set(encoded.subarray(0, 32));
  return bytes;
}

// ─── Instruction Builders ──────────────────────────────────────────

/**
 * Build the `initialize_app` instruction.
 */
export async function buildInitializeAppIx(
  developer: PublicKey,
  appId: Uint8Array,
  priceUsdc: bigint,
  developerFeeBps: number,
  ipfsCid: Uint8Array
): Promise<TransactionInstruction> {
  const [appRegistryPda] = getAppRegistryPda(appId);
  const disc = await anchorDiscriminator("initialize_app");

  // Serialize: disc(8) + app_id(32) + price_usdc(8) + developer_fee_bps(2) + ipfs_cid(64)
  const data = Buffer.alloc(8 + 32 + 8 + 2 + 64);
  disc.copy(data, 0);
  Buffer.from(appId).copy(data, 8);
  data.writeBigUInt64LE(priceUsdc, 40);
  data.writeUInt16LE(developerFeeBps, 48);
  const cidBuf = Buffer.alloc(64);
  Buffer.from(ipfsCid).copy(cidBuf, 0);
  cidBuf.copy(data, 50);

  return new TransactionInstruction({
    keys: [
      { pubkey: appRegistryPda, isSigner: false, isWritable: true },
      { pubkey: developer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: KEYSTONE_MARKETPLACE_PROGRAM_ID,
    data,
  });
}

/**
 * Build the `purchase_app` instruction.
 */
export async function buildPurchaseAppIx(params: {
  appId: Uint8Array;
  appRegistry: PublicKey;
  developer: PublicKey;
  buyer: PublicKey;
  buyerUsdcAccount: PublicKey;
  developerUsdcAccount: PublicKey;
  treasuryUsdcAccount: PublicKey;
  usdcMint: PublicKey;
  licenseMint: PublicKey;
  licenseAuthority: PublicKey;
  buyerLicenseAccount: PublicKey;
}): Promise<TransactionInstruction> {
  const disc = await anchorDiscriminator("purchase_app");

  // Serialize: disc(8) + app_id(32)
  const data = Buffer.alloc(8 + 32);
  disc.copy(data, 0);
  Buffer.from(params.appId).copy(data, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: params.appRegistry, isSigner: false, isWritable: true },
      { pubkey: params.developer, isSigner: false, isWritable: false },
      { pubkey: params.buyer, isSigner: true, isWritable: true },
      { pubkey: params.buyerUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: params.developerUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: params.treasuryUsdcAccount, isSigner: false, isWritable: true },
      { pubkey: params.usdcMint, isSigner: false, isWritable: false },
      { pubkey: params.licenseMint, isSigner: false, isWritable: true },
      { pubkey: params.licenseAuthority, isSigner: false, isWritable: false },
      { pubkey: params.buyerLicenseAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: KEYSTONE_MARKETPLACE_PROGRAM_ID,
    data,
  });
}

// ─── High-Level Transaction Builders ───────────────────────────────

/**
 * Build a full purchase transaction including:
 * 1. Create license mint (if needed) — 0-decimal SPL token = NFT
 * 2. Mint authority set to license_authority PDA
 * 3. Create buyer's license ATA (if needed)
 * 4. Call purchase_app instruction (USDC split + NFT mint)
 */
export async function buildPurchaseTransaction(params: {
  connection: Connection;
  buyer: PublicKey;
  appId: string;
  developer: PublicKey;
  treasuryWallet: PublicKey;
  usdcMint?: PublicKey;
  existingLicenseMint?: PublicKey;
}): Promise<{
  transaction: Transaction;
  licenseMintKeypair: Keypair | null;
  appRegistryPda: PublicKey;
  licenseAuthorityPda: PublicKey;
  lastValidBlockHeight: number;
}> {
  const {
    connection,
    buyer,
    appId,
    developer,
    treasuryWallet,
    usdcMint = USDC_MINT_DEVNET,
  } = params;

  const appIdBytes = appIdToBytes(appId);
  const [appRegistryPda] = getAppRegistryPda(appIdBytes);
  const [licenseAuthorityPda] = getLicenseAuthorityPda(appRegistryPda);

  const transaction = new Transaction();
  let licenseMintKeypair: Keypair | null = null;
  let licenseMint: PublicKey;

  if (params.existingLicenseMint) {
    licenseMint = params.existingLicenseMint;
  } else {
    // Create a new license mint (0 decimals = NFT-like token)
    licenseMintKeypair = Keypair.generate();
    licenseMint = licenseMintKeypair.publicKey;

    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: buyer,
        newAccountPubkey: licenseMint,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // Initialize mint: authority = PDA so program can mint license tokens
    transaction.add(
      createInitializeMintInstruction(
        licenseMint,
        0,                    // 0 decimals = NFT
        licenseAuthorityPda,  // mint authority = PDA
        null,                 // no freeze authority
        TOKEN_PROGRAM_ID
      )
    );
  }

  // Derive all ATAs
  const buyerUsdcAta = await getAssociatedTokenAddress(usdcMint, buyer);
  const developerUsdcAta = await getAssociatedTokenAddress(usdcMint, developer);
  const treasuryUsdcAta = await getAssociatedTokenAddress(usdcMint, treasuryWallet);
  const buyerLicenseAta = await getAssociatedTokenAddress(licenseMint, buyer);

  // Create ATAs that don't exist yet
  const [buyerLicenseInfo, devUsdcInfo, treasuryUsdcInfo] = await Promise.all([
    connection.getAccountInfo(buyerLicenseAta),
    connection.getAccountInfo(developerUsdcAta),
    connection.getAccountInfo(treasuryUsdcAta),
  ]);

  if (!buyerLicenseInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(buyer, buyerLicenseAta, buyer, licenseMint)
    );
  }
  if (!devUsdcInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(buyer, developerUsdcAta, developer, usdcMint)
    );
  }
  if (!treasuryUsdcInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(buyer, treasuryUsdcAta, treasuryWallet, usdcMint)
    );
  }

  // Build the purchase_app instruction
  const purchaseIx = await buildPurchaseAppIx({
    appId: appIdBytes,
    appRegistry: appRegistryPda,
    developer,
    buyer,
    buyerUsdcAccount: buyerUsdcAta,
    developerUsdcAccount: developerUsdcAta,
    treasuryUsdcAccount: treasuryUsdcAta,
    usdcMint,
    licenseMint,
    licenseAuthority: licenseAuthorityPda,
    buyerLicenseAccount: buyerLicenseAta,
  });
  transaction.add(purchaseIx);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyer;

  if (licenseMintKeypair) {
    transaction.partialSign(licenseMintKeypair);
  }

  return {
    transaction,
    licenseMintKeypair,
    appRegistryPda,
    licenseAuthorityPda,
    lastValidBlockHeight,
  };
}

/**
 * Check if an app is registered on-chain.
 */
export async function isAppOnChain(
  connection: Connection,
  appId: string
): Promise<boolean> {
  const appIdBytes = appIdToBytes(appId);
  const [appRegistryPda] = getAppRegistryPda(appIdBytes);
  const info = await connection.getAccountInfo(appRegistryPda);
  return info !== null;
}

// ─── Revenue Helpers ───────────────────────────────────────────────

export function calculateRevenueSplit(priceAmount: number): {
  developerShare: number;
  protocolShare: number;
} {
  const developerShare = (priceAmount * DEVELOPER_FEE_BPS) / 10000;
  const protocolShare = (priceAmount * PROTOCOL_FEE_BPS) / 10000;
  return { developerShare, protocolShare };
}

/** Get the full Anchor IDL */
export function getMarketplaceIdl() {
  return MARKETPLACE_IDL;
}
