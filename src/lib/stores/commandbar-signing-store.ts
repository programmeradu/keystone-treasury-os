// Feature: commandbar-god-mode
// Zustand slice for CommandBar signing state (Requirement 18.6)

import { create } from "zustand";

interface CommandBarSigningState {
  signingToolId: string | null;
  signingStatus: "idle" | "signing" | "sent" | "error";
  txSignatures: string[];
  setSigningToolId: (id: string | null) => void;
  setSigningStatus: (s: CommandBarSigningState["signingStatus"]) => void;
  setTxSignatures: (sigs: string[]) => void;
  reset: () => void;
}

export const useCommandBarSigningStore = create<CommandBarSigningState>((set) => ({
  signingToolId: null,
  signingStatus: "idle",
  txSignatures: [],
  setSigningToolId: (id) => set({ signingToolId: id }),
  setSigningStatus: (s) => set({ signingStatus: s }),
  setTxSignatures: (sigs) => set({ txSignatures: sigs }),
  reset: () => set({ signingToolId: null, signingStatus: "idle", txSignatures: [] }),
}));
