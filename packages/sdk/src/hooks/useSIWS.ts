/**
 * Sign-In With Solana — One-click auth with session persistence.
 */

import { useState, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { SIWSState } from "../types";

export function useSIWS(): SIWSState {
  const [session, setSession] = useState<{ address: string; chainId: number } | null>(null);

  const signIn = useCallback(async () => {
    const bridge = getBridge();
    const result = (await bridge.call(BridgeMethods.SIWS_SIGN, {})) as {
      message: string;
      signature: string;
      address: string;
      chainId: number;
    };
    if (result?.address) {
      setSession({ address: result.address, chainId: result.chainId });
    }
    return { message: result?.message ?? "", signature: result?.signature ?? "" };
  }, []);

  const verify = useCallback(async (message: string, signature: string) => {
    const bridge = getBridge();
    const result = (await bridge.call(BridgeMethods.SIWS_VERIFY, {
      message,
      signature,
    })) as boolean;
    return result ?? false;
  }, []);

  return { signIn, verify, session };
}
