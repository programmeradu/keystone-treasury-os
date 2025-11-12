
import { create } from 'zustand';

type AtlasCommand = {
  tool_id: string;
  parameters: Record<string, any>;
  timestamp: number;
};

type CommandState = {
  lastCommand: AtlasCommand | null;
  dispatch: (command: Omit<AtlasCommand, 'timestamp'>) => void;
};

export const useAtlasCommand = create<CommandState>((set) => ({
  lastCommand: null,
  dispatch: (command) => set({ lastCommand: { ...command, timestamp: Date.now() } }),
}));
