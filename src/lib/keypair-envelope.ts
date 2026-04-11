import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the master encryption key from env.
 * Must be a 32-byte hex string (64 hex chars).
 */
function getMasterKey(): Buffer {
  const hex = process.env.KEYPAIR_MASTER_KEY;
  if (!hex) {
    throw new Error("KEYPAIR_MASTER_KEY must be configured for DCA bot keypair encryption");
  }
  if (hex.length !== 64) {
    throw new Error("KEYPAIR_MASTER_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a base58-encoded secret key using AES-256-GCM.
 * Returns a string in the format: base64(iv + ciphertext + authTag)
 */
export function encryptKeypair(base58SecretKey: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const plaintext = Buffer.from(base58SecretKey, "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (12) + ciphertext (variable) + authTag (16)
  const packed = Buffer.concat([iv, encrypted, authTag]);
  return packed.toString("base64");
}

/**
 * Decrypt an encrypted keypair back to a base58 secret key.
 */
export function decryptKeypair(encryptedBase64: string): string {
  const key = getMasterKey();
  const packed = Buffer.from(encryptedBase64, "base64");

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted keypair: too short");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
