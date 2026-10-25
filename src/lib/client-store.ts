'use client';
import { create } from 'zustand';
import { Action, FinancialState } from './model';
type Store = {
  state: FinancialState | null;
  demo: boolean;
  storage: string;
  error: string | null;
  saving: boolean;
  loaded: boolean;
  highlightedNode: string | null;
  aiOpen: boolean;
  load: () => Promise<void>;
  act: (action: Action) => Promise<boolean>;
  accept: (state: FinancialState) => void;
};
export async function request(path: string, body?: unknown) {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export const useFinance = create<Store>((set, get) => ({
  state: null,
  demo: true,
  storage: '',
  error: null,
  saving: false,
  loaded: false,
  highlightedNode: null,
  aiOpen: false,
  async load() {
    try {
      const data = await request('/api/finances');
      set({ state: data.state, demo: data.demo, storage: data.storage, error: null, loaded: true });
    } catch (e) {
      set({ error: (e as Error).message, loaded: true });
    }
  },
  async act(action) {
    const current = get().state;
    if (!current || get().saving) return false;
    set({ saving: true, error: null });
    try {
      const data = await request('/api/finances', { version: current.version, action });
      set({ state: data.state, saving: false });
      broadcast();
      return true;
    } catch (e) {
      const error = (e as Error).message;
      if (error.startsWith('Conflict')) await get().load();
      set({ saving: false, error });
      return false;
    }
  },
  accept(state) {
    set({ state, error: null });
    broadcast();
  },
}));
function broadcast() {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('fork-finances');
    channel.postMessage('refresh');
    channel.close();
  }
}
