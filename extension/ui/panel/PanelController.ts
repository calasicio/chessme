import { ELO_BUCKET_OPTIONS, findEloBucketOption } from '@/core/eloBuckets';
import type { MaiaPrediction } from '@/core/maiaSession';
import type { FenSource } from '@/positionSource/PositionSource';
import { CHESSCOM_PANEL_STYLES } from './chesscomStyles';
import { LICHESS_PANEL_STYLES } from './lichessStyles';
import { DEFAULT_SETTINGS, type Maia2Settings } from './settingsStore';

export type PanelTheme = 'chesscom' | 'lichess';

function eloOptionsHtml(selectedElo: number): string {
  const selectedOption = findEloBucketOption(selectedElo);
  return ELO_BUCKET_OPTIONS.map(
    (option) =>
      `<option value="${option.value}" ${option.value === selectedOption.value ? 'selected' : ''}>${option.label}</option>`,
  ).join('');
}

export type RunState = 'running' | 'stopped';
export type StatusDot = 'idle' | 'thinking' | 'stopped' | 'error';

export interface PanelCallbacks {
  onSettingsChange: (settings: Maia2Settings) => void;
  onToggleRunning: () => void;
  onRestart: () => void;
}

const FAB_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2 L20 7 V17 L12 22 L4 17 V7 Z" stroke="white" stroke-width="1.6" fill="rgba(255,255,255,.12)"/>
  <circle cx="12" cy="12" r="3.2" fill="white"/>
</svg>`;

export class PanelController {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly fab: HTMLButtonElement;
  private readonly statusDot: HTMLElement;
  private readonly panel: HTMLElement;
  private settings: Maia2Settings;

  get shadowRoot(): ShadowRoot {
    return this.shadow;
  }
  private runState: RunState = 'running';

  constructor(
    private readonly callbacks: PanelCallbacks,
    initialSettings: Maia2Settings = DEFAULT_SETTINGS,
    theme: PanelTheme = 'chesscom',
  ) {
    this.settings = initialSettings;

    this.host = document.createElement('div');
    this.host.id = 'maia2-panel-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = theme === 'lichess' ? LICHESS_PANEL_STYLES : CHESSCOM_PANEL_STYLES;
    this.shadow.appendChild(style);

    this.fab = document.createElement('button');
    this.fab.className = 'fab';
    this.fab.setAttribute('aria-label', 'Chessme suggestions');
    this.fab.innerHTML = FAB_ICON;
    this.statusDot = document.createElement('span');
    this.statusDot.className = 'fab-status';
    this.statusDot.dataset.state = 'idle';
    this.fab.appendChild(this.statusDot);
    this.fab.addEventListener('click', () => this.togglePanelVisible());
    this.shadow.appendChild(this.fab);

    this.panel = document.createElement('div');
    this.panel.className = 'panel';
    this.panel.hidden = true;
    this.shadow.appendChild(this.panel);

    this.renderPanel();
    document.body.appendChild(this.host);
  }

  private togglePanelVisible() {
    this.panel.hidden = !this.panel.hidden;
  }

  setFabVisible(visible: boolean): void {
    this.host.style.display = visible ? '' : 'none';
    if (!visible) this.panel.hidden = true;
  }

  setStatus(state: StatusDot): void {
    this.statusDot.dataset.state = state;
  }

  setRunState(runState: RunState): void {
    this.runState = runState;
    const toggleBtn = this.shadow.querySelector<HTMLButtonElement>(
      '[data-action="toggle-running"]',
    );
    if (toggleBtn) toggleBtn.textContent = runState === 'running' ? 'Stop' : 'Start';
    if (runState === 'stopped') this.setStatus('stopped');
  }

  updateSettingsFromExternal(settings: Maia2Settings): void {
    this.settings = settings;
    this.renderPanel();
  }

  setStatusMessage(message: string, isError = false): void {
    const el = this.shadow.querySelector<HTMLElement>('.status-line');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', isError);
  }

  renderPrediction(
    prediction: MaiaPrediction,
    meta: { fenSource: FenSource; role: 'self' | 'opponent' },
  ): void {
    this.setStatus('idle');
    const resultsEl = this.shadow.querySelector<HTMLElement>('.results');
    if (!resultsEl) return;

    const winPct = Math.round(prediction.winProbWhite * 100);
    const roleLabel = meta.role === 'opponent' ? "Opponent's likely reply" : 'Your suggested moves';
    const approxNote = meta.fenSource === 'board-only' ? ' (approximate position)' : '';

    const rows = prediction.moves
      .slice(0, this.settings.topN)
      .map((m) => `<tr><td>${m.uci}</td><td>${(m.probability * 100).toFixed(1)}%</td></tr>`)
      .join('');

    resultsEl.innerHTML = `
      <p class="status-line">${roleLabel}${approxNote}</p>
      <div class="win-bar">
        <div class="win-bar-fill" style="width:${winPct}%"></div>
        <span class="win-bar-label">White ${winPct}% / Black ${100 - winPct}%</span>
      </div>
      <table class="moves-table">
        <thead><tr><th>Move</th><th>Prob.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  destroy(): void {
    this.host.remove();
  }

  private renderPanel(): void {
    const s = this.settings;
    this.panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">Chessme</span>
        <button class="panel-close" data-action="close" aria-label="Close">&times;</button>
      </div>

      <div class="panel-section">
        <p class="section-label">Status</p>
        <p class="status-line">Waiting for a position&hellip;</p>
        <div class="results"></div>
      </div>

      <div class="panel-section">
        <p class="section-label">Controls</p>
        <div class="control-buttons">
          <button class="cc-btn primary" data-action="toggle-running">${this.runState === 'running' ? 'Stop' : 'Start'}</button>
          <button class="cc-btn secondary" data-action="restart">Restart</button>
        </div>
      </div>

      <div class="panel-section">
        <p class="section-label">Model</p>
        <div class="row">
          <span class="row-label">Variant</span>
          <select class="cc-select" data-field="variant">
            <option value="rapid" ${s.variant === 'rapid' ? 'selected' : ''}>Rapid</option>
            <option value="blitz" ${s.variant === 'blitz' ? 'selected' : ''}>Blitz</option>
          </select>
        </div>
        <div class="row">
          <span class="row-label">My Elo</span>
          <select class="cc-select" data-field="eloSelf">${eloOptionsHtml(s.eloSelf)}</select>
        </div>
        <div class="row">
          <span class="row-label">Opponent Elo</span>
          <select class="cc-select" data-field="eloOppoMode">
            <option value="auto" ${s.eloOppoMode === 'auto' ? 'selected' : ''}>Auto-detect</option>
            <option value="manual" ${s.eloOppoMode === 'manual' ? 'selected' : ''}>Manual</option>
          </select>
        </div>
        <div class="row" ${s.eloOppoMode === 'manual' ? '' : 'hidden'} data-row="eloOppoManual">
          <span class="row-label">&nbsp;</span>
          <select class="cc-select" data-field="eloOppoManual">${eloOptionsHtml(s.eloOppoManual)}</select>
        </div>
        <p class="status-line" style="margin-top:.4rem">Maia2 can't tell ratings apart within the same bucket &mdash; these 11 options are the real resolution.</p>
      </div>

      <div class="panel-section">
        <p class="section-label">Display</p>
        <div class="row">
          <span class="row-label">Lines to show</span>
          <input class="cc-range" type="range" min="1" max="5" step="1" data-field="topN" value="${s.topN}" />
          <span data-display="topN">${s.topN}</span>
        </div>
        <div class="row">
          <span class="row-label">Show opponent's lines too</span>
          <label class="cc-toggle">
            <input type="checkbox" data-field="showOpponentLines" ${s.showOpponentLines ? 'checked' : ''} />
            <span class="cc-toggle-track"></span>
          </label>
        </div>
        <div class="row">
          <span class="row-label">My arrow color</span>
          <input class="cc-input" type="color" data-field="selfColor" value="${s.selfColor}" />
        </div>
        <div class="row">
          <span class="row-label">Opponent arrow color</span>
          <input class="cc-input" type="color" data-field="opponentColor" value="${s.opponentColor}" />
        </div>
      </div>
    `;
    this.attachPanelListeners();
  }

  private attachPanelListeners(): void {
    this.panel
      .querySelector<HTMLButtonElement>('[data-action="close"]')
      ?.addEventListener('click', () => (this.panel.hidden = true));
    this.panel
      .querySelector<HTMLButtonElement>('[data-action="toggle-running"]')
      ?.addEventListener('click', () => this.callbacks.onToggleRunning());
    this.panel
      .querySelector<HTMLButtonElement>('[data-action="restart"]')
      ?.addEventListener('click', () => this.callbacks.onRestart());

    const emit = () => this.callbacks.onSettingsChange({ ...this.settings });

    this.bindField<'variant'>(
      'variant',
      (v) => (this.settings.variant = v as Maia2Settings['variant']),
      emit,
    );
    this.bindField('eloSelf', (v) => (this.settings.eloSelf = Number(v)), emit);
    this.bindField(
      'eloOppoMode',
      (v) => {
        this.settings.eloOppoMode = v as Maia2Settings['eloOppoMode'];
        const row = this.panel.querySelector<HTMLElement>('[data-row="eloOppoManual"]');
        if (row) row.hidden = this.settings.eloOppoMode !== 'manual';
      },
      emit,
    );
    this.bindField('eloOppoManual', (v) => (this.settings.eloOppoManual = Number(v)), emit);
    this.bindField('selfColor', (v) => (this.settings.selfColor = v), emit);
    this.bindField('opponentColor', (v) => (this.settings.opponentColor = v), emit);

    const topNInput = this.panel.querySelector<HTMLInputElement>('[data-field="topN"]');
    const topNDisplay = this.panel.querySelector<HTMLElement>('[data-display="topN"]');
    topNInput?.addEventListener('input', () => {
      this.settings.topN = Number(topNInput.value);
      if (topNDisplay) topNDisplay.textContent = topNInput.value;
    });
    topNInput?.addEventListener('change', emit);

    const opponentLinesInput = this.panel.querySelector<HTMLInputElement>(
      '[data-field="showOpponentLines"]',
    );
    opponentLinesInput?.addEventListener('change', () => {
      this.settings.showOpponentLines = opponentLinesInput.checked;
      emit();
    });
  }

  private bindField<T extends string>(
    field: T,
    apply: (value: string) => void,
    emit: () => void,
  ): void {
    const el = this.panel.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[data-field="${field}"]`,
    );
    el?.addEventListener('change', () => {
      apply(el.value);
      emit();
    });
  }
}
