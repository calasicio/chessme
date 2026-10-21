import { evaluatePosition } from '@/core/maiaSession';
import type { MaiaOrtSession } from '@/core/ortTypes';
import { ManualInputPositionSource } from '@/positionSource/manualInput';
import { loadMaiaOrtSession } from '@/runtime/ortWebSession';

type Variant = 'rapid' | 'blitz';

const form = document.querySelector<HTMLFormElement>('#position-form')!;
const fenInput = document.querySelector<HTMLInputElement>('#fen')!;
const eloSelfInput = document.querySelector<HTMLInputElement>('#elo-self')!;
const eloOppoInput = document.querySelector<HTMLInputElement>('#elo-oppo')!;
const variantSelect = document.querySelector<HTMLSelectElement>('#variant')!;
const evaluateButton = document.querySelector<HTMLButtonElement>('#evaluate')!;
const statusEl = document.querySelector<HTMLSpanElement>('#status')!;
const resultSection = document.querySelector<HTMLElement>('#result')!;
const winBarFill = document.querySelector<HTMLElement>('#win-bar-fill')!;
const winBarLabel = document.querySelector<HTMLElement>('#win-bar-label')!;
const movesBody = document.querySelector<HTMLElement>('#moves-body')!;

const positionSource = new ManualInputPositionSource(fenInput, eloSelfInput, eloOppoInput);

const sessions = new Map<Variant, Promise<MaiaOrtSession>>();

function getSession(variant: Variant): Promise<MaiaOrtSession> {
  let session = sessions.get(variant);
  if (!session) {
    session = loadMaiaOrtSession(browser.runtime.getURL(`/models/maia2-${variant}.onnx`));
    sessions.set(variant, session);
  }
  return session;
}

function renderResult(winProbWhite: number, moves: { uci: string; probability: number }[]) {
  resultSection.hidden = false;

  const winPct = Math.round(winProbWhite * 100);
  winBarFill.style.width = `${winPct}%`;
  winBarLabel.textContent = `White ${winPct}% / Black ${100 - winPct}%`;

  movesBody.replaceChildren();
  for (const { uci, probability } of moves.slice(0, 15)) {
    const row = document.createElement('tr');
    const moveCell = document.createElement('td');
    moveCell.textContent = uci;
    const probCell = document.createElement('td');
    probCell.textContent = `${(probability * 100).toFixed(1)}%`;
    row.append(moveCell, probCell);
    movesBody.append(row);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  evaluateButton.disabled = true;
  statusEl.textContent = 'Loading model…';

  try {
    const variant = variantSelect.value as Variant;
    const session = await getSession(variant);

    statusEl.textContent = 'Evaluating…';
    const fen = positionSource.getFen();
    const eloSelf = positionSource.getEloSelf();
    const eloOppo = positionSource.getEloOppo();

    const prediction = await evaluatePosition(session, fen, eloSelf, eloOppo);
    renderResult(prediction.winProbWhite, prediction.moves);
    statusEl.textContent = '';
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    evaluateButton.disabled = false;
  }
});
