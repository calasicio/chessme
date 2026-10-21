import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  onSettingsChanged,
  saveSettings,
} from '@/ui/panel/settingsStore';

function installFakeStorage() {
  const data: Record<string, unknown> = {};
  const changeListeners: Array<
    (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void
  > = [];

  // @ts-expect-error
  globalThis.browser = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: data[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) {
            const oldValue = data[key];
            data[key] = value;
            for (const listener of changeListeners)
              listener({ [key]: { oldValue, newValue: value } });
          }
        }),
      },
      onChanged: {
        addListener: vi.fn((listener: (typeof changeListeners)[number]) =>
          changeListeners.push(listener),
        ),
        removeListener: vi.fn((listener: (typeof changeListeners)[number]) => {
          const index = changeListeners.indexOf(listener);
          if (index >= 0) changeListeners.splice(index, 1);
        }),
      },
    },
  };
  return data;
}

describe('settingsStore', () => {
  beforeEach(() => installFakeStorage());
  afterEach(() => {
    // @ts-expect-error
    delete globalThis.browser;
  });

  it('returns all defaults when nothing has been saved yet', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges saved values over defaults, so adding a new setting later never crashes old stored data', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, eloSelf: 1800, variant: 'blitz' });
    const loaded = await loadSettings();
    expect(loaded.eloSelf).toBe(1800);
    expect(loaded.variant).toBe('blitz');
    expect(loaded.topN).toBe(DEFAULT_SETTINGS.topN);
  });

  it('notifies subscribers when settings change, with defaults merged in', async () => {
    const callback = vi.fn();
    const unsubscribe = onSettingsChanged(callback);

    await saveSettings({ ...DEFAULT_SETTINGS, topN: 5 });
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ topN: 5 }));

    unsubscribe();
    await saveSettings({ ...DEFAULT_SETTINGS, topN: 1 });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
