/**
 * Bridge getter — host sets via setBridge() or globalThis.keystoneBridge
 */

import type { KeystoneBridge } from "./bridge";

let bridgeInstance: KeystoneBridge | null = null;

export function setBridge(bridge: KeystoneBridge): void {
  bridgeInstance = bridge;
}

export function getBridge(): KeystoneBridge {
  if (bridgeInstance) return bridgeInstance;
  const global = typeof globalThis !== "undefined" ? globalThis : (window as unknown as Record<string, unknown>);
  const b = (global as { keystoneBridge?: KeystoneBridge }).keystoneBridge;
  if (!b) {
    throw new Error(
      "[@keystone-os/sdk] No bridge. Call setBridge() or ensure host injects keystoneBridge."
    );
  }
  return b;
}
