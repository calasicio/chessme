// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PanelController } from '@/ui/panel/PanelController';
import { DEFAULT_SETTINGS } from '@/ui/panel/settingsStore';

function getShadow(panel: PanelController): ShadowRoot {
  return panel.shadowRoot;
}

describe('PanelController', () => {
  afterEach(() => {
    document.getElementById('maia2-panel-host')?.remove();
  });

  it('defaults to the chess.com theme, and switches to the lichess theme when requested', () => {
    const chesscomPanel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const chesscomCss = getShadow(chesscomPanel).querySelector('style')!.textContent!;
    expect(chesscomCss).toContain('#81B64C');
    chesscomPanel.destroy();

    const lichessPanel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
      'lichess',
    );
    const lichessCss = getShadow(lichessPanel).querySelector('style')!.textContent!;
    expect(lichessCss).toContain('hsl(209, 79%, 56%)');
    expect(lichessCss).not.toContain('#81B64C');
  });

  it('mounts a FAB and a hidden panel inside a shadow root', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);
    expect(shadow.querySelector('.fab')).toBeTruthy();
    expect(shadow.querySelector<HTMLElement>('.panel')!.hidden).toBe(true);
  });

  it('toggles panel visibility when the FAB is clicked', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);
    const fab = shadow.querySelector<HTMLButtonElement>('.fab')!;
    const panelEl = shadow.querySelector<HTMLElement>('.panel')!;

    fab.click();
    expect(panelEl.hidden).toBe(false);
    fab.click();
    expect(panelEl.hidden).toBe(true);
  });

  it('hides the whole FAB (and closes the panel) when setFabVisible(false)', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);
    shadow.querySelector<HTMLButtonElement>('.fab')!.click();
    panel.setFabVisible(false);

    const host = document.getElementById('maia2-panel-host')!;
    expect(host.style.display).toBe('none');
    expect(shadow.querySelector<HTMLElement>('.panel')!.hidden).toBe(true);
  });

  it('calls onToggleRunning and onRestart from their buttons', () => {
    const onToggleRunning = vi.fn();
    const onRestart = vi.fn();
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning, onRestart },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);

    shadow.querySelector<HTMLButtonElement>('[data-action="toggle-running"]')!.click();
    expect(onToggleRunning).toHaveBeenCalledTimes(1);
    shadow.querySelector<HTMLButtonElement>('[data-action="restart"]')!.click();
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('emits settings changes (e.g. topN) with the rest of the settings intact', () => {
    const onSettingsChange = vi.fn();
    const panel = new PanelController(
      { onSettingsChange, onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);

    const topNInput = shadow.querySelector<HTMLInputElement>('[data-field="topN"]')!;
    topNInput.value = '5';
    topNInput.dispatchEvent(new Event('input'));
    topNInput.dispatchEvent(new Event('change'));

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ topN: 5, variant: 'rapid' }),
    );
  });

  it('offers exactly the 11 real Elo buckets, not a free-form range', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);
    const eloSelect = shadow.querySelector<HTMLSelectElement>('[data-field="eloSelf"]')!;
    expect(eloSelect.tagName).toBe('SELECT');
    expect(eloSelect.options).toHaveLength(11);
    expect(eloSelect.options[0]!.textContent).toBe('<1100');
    expect(eloSelect.options.item(10)!.textContent).toBe('>=2000');
  });

  it('pre-selects the bucket matching a legacy off-grid stored value (e.g. 1537) rather than defaulting to the first option', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      { ...DEFAULT_SETTINGS, eloSelf: 1537 },
    );
    const shadow = getShadow(panel);
    const eloSelect = shadow.querySelector<HTMLSelectElement>('[data-field="eloSelf"]')!;
    expect(eloSelect.selectedOptions[0]!.textContent).toBe('1500-1599');
  });

  it('emits the bucket representative value (not the raw typed number) when the Elo dropdown changes', () => {
    const onSettingsChange = vi.fn();
    const panel = new PanelController(
      { onSettingsChange, onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);
    const eloSelect = shadow.querySelector<HTMLSelectElement>('[data-field="eloSelf"]')!;
    eloSelect.value = '1950';
    eloSelect.dispatchEvent(new Event('change'));
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ eloSelf: 1950 }));
  });

  it('reveals the manual Elo row only when eloOppoMode is set to manual', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);
    const row = shadow.querySelector<HTMLElement>('[data-row="eloOppoManual"]')!;
    expect(row.hidden).toBe(true);

    const select = shadow.querySelector<HTMLSelectElement>('[data-field="eloOppoMode"]')!;
    select.value = 'manual';
    select.dispatchEvent(new Event('change'));
    expect(row.hidden).toBe(false);
  });

  it('renders a prediction as a win bar and a ranked move table', () => {
    const panel = new PanelController(
      { onSettingsChange: vi.fn(), onToggleRunning: vi.fn(), onRestart: vi.fn() },
      DEFAULT_SETTINGS,
    );
    const shadow = getShadow(panel);

    panel.renderPrediction(
      {
        moves: [
          { uci: 'e2e4', probability: 0.6 },
          { uci: 'd2d4', probability: 0.3 },
        ],
        winProbWhite: 0.62,
      },
      { fenSource: 'replay', role: 'self' },
    );

    expect(shadow.querySelector('.win-bar-fill')!.getAttribute('style')).toContain('62%');
    const rows = shadow.querySelectorAll('.moves-table tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain('e2e4');
    expect(rows[0]!.textContent).toContain('60.0%');
  });
});
