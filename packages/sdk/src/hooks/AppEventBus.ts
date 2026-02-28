import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { EventBus } from "../types";

export const AppEventBus: EventBus = {
  emit: (type: string, payload?: unknown) => {
    getBridge().notify(BridgeMethods.EVENT_EMIT, { type, payload });
  },
};
