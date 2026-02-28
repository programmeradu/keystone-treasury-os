/**
 * Blinks-in-a-Box — Export any Mini-App function as a Solana Blink.
 * Vote/sign from X, Discord via metadata-rich links.
 */

import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface BlinkAction {
  label: string;
  payload: Record<string, unknown>;
  type?: "vote" | "sign" | "transfer" | "custom";
}

export interface BlinkExportResult {
  url: string;
  actionId: string;
}

/**
 * Export an action as a Solana Blink. Returns shareable URL.
 */
export async function toBlink(action: BlinkAction): Promise<BlinkExportResult> {
  const bridge = getBridge();
  const result = (await bridge.call(BridgeMethods.BLINK_EXPORT, {
    label: action.label,
    payload: action.payload,
    type: action.type ?? "custom",
  })) as BlinkExportResult;
  return result;
}
