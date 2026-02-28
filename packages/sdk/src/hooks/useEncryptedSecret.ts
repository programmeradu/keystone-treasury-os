/**
 * Lit Protocol-based encrypted secret management.
 * Wallet-based access control — only treasury owner can decrypt.
 */

import { useState, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface UseEncryptedSecretResult {
  encrypt: (plaintext: string, keyId?: string) => Promise<string>;
  decrypt: (ciphertext: string, keyId?: string) => Promise<string>;
  loading: boolean;
  error: string | null;
}

export function useEncryptedSecret(): UseEncryptedSecretResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt = useCallback(async (plaintext: string, keyId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.LIT_ENCRYPT, {
        plaintext,
        keyId: keyId ?? "default",
      })) as string;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const decrypt = useCallback(async (ciphertext: string, keyId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.LIT_DECRYPT, {
        ciphertext,
        keyId: keyId ?? "default",
      })) as string;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { encrypt, decrypt, loading, error };
}
