import { useMemo } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { TurnkeyState } from "../types";

/**
 * Hook for Turnkey wallet operations (getPublicKey, signTransaction).
 * All signing routes through the host — Glass Safety Standard.
 */
export function useTurnkey(): TurnkeyState {
  return useMemo(
    () => ({
      getPublicKey: async () => {
        const bridge = getBridge();
        return (await bridge.call(BridgeMethods.TURNKEY_GET_PK)) as string;
      },
      signTransaction: async (transaction: unknown, description?: string) => {
        const bridge = getBridge();
        const result = (await bridge.call(BridgeMethods.TURNKEY_SIGN, {
          transaction,
          description: description ?? "Sign transaction",
        })) as { signature: string };
        return result;
      },
    }),
    []
  );
}
