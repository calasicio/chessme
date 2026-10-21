import type { Browser } from 'wxt/browser';
import type { MaiaVariant } from '@/messaging/maiaProtocol';

export interface Maia2Settings {
  variant: MaiaVariant;
  eloSelf: number;

  eloOppoMode: 'auto' | 'manual';
  eloOppoManual: number;

  topN: number;

  showOpponentLines: boolean;

  selfColor: string;

  opponentColor: string;
}

export const DEFAULT_SETTINGS: Maia2Settings = {
  variant: 'rapid',
  eloSelf: 1500,
  eloOppoMode: 'auto',
  eloOppoManual: 1500,
  topN: 3,
  showOpponentLines: false,
  selfColor: '#7A66F4',
  opponentColor: '#009FD9',
};

const STORAGE_KEY = 'maia2:settings';

export async function loadSettings(): Promise<Maia2Settings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Partial<Maia2Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...value };
}

export async function saveSettings(settings: Maia2Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export function onSettingsChanged(callback: (settings: Maia2Settings) => void): () => void {
  const listener = (changes: Record<string, Browser.storage.StorageChange>) => {
    const change = changes[STORAGE_KEY];
    if (!change) return;
    callback({ ...DEFAULT_SETTINGS, ...(change.newValue as Partial<Maia2Settings>) });
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
