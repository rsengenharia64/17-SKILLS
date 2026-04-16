import { create } from 'zustand';

export type SaveState = 'idle' | 'saving' | 'saved' | 'pending' | 'synced' | 'error';

interface UIState {
  saveState: SaveState;
  lastSavedAt: string | null;
  online: boolean;
  setSaveState: (s: SaveState) => void;
  setLastSavedAt: (iso: string) => void;
  setOnline: (v: boolean) => void;
}

export const useUIStore = create<UIState>(set => ({
  saveState: 'idle',
  lastSavedAt: null,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setSaveState: s => set({ saveState: s }),
  setLastSavedAt: iso => set({ lastSavedAt: iso }),
  setOnline: v => set({ online: v }),
}));
