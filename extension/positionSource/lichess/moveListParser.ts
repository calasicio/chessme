import { Chess } from 'chess.js';
import { findLichessMoveList } from './presence';

export interface Ply {
  ply: number;
  color: 'w' | 'b';
  san: string;
  selected: boolean;
}

export interface ParsedMoveList {
  plies: Ply[];

  result: string;
  viewing: number;
  over: boolean;
}

export function parseMoveList(root: ParentNode): ParsedMoveList | null {
  const list = findLichessMoveList(root);
  if (!list) return null;

  const plies: Ply[] = [];
  const moveEls = list.querySelectorAll('z7yx');
  moveEls.forEach((el, index) => {
    const san = el.textContent?.trim() ?? '';
    if (!san) return;
    plies.push({
      ply: index + 1,
      color: index % 2 === 0 ? 'w' : 'b',
      san,
      selected: el.className.trim() !== '',
    });
  });

  const result = '*';
  const viewing = plies.find((p) => p.selected)?.ply ?? plies.at(-1)?.ply ?? 0;

  return { plies, result, viewing, over: result !== '*' };
}

export function toPGN({ plies, result }: ParsedMoveList): string {
  let out = '';
  for (const p of plies) {
    if (p.color === 'w') out += `${Math.ceil(p.ply / 2)}. `;
    out += p.san + ' ';
  }
  return `${out}${result}`.trim();
}

export interface ReplayResult {
  fens: string[];
  pgn: string;
}

export function replay({ plies, result }: ParsedMoveList): ReplayResult {
  const game = new Chess();
  const fens = [game.fen()];
  for (const p of plies) {
    try {
      game.move(p.san);
    } catch (error) {
      throw new Error(`Bad SAN at ply ${p.ply} ("${p.san}"): ${(error as Error).message}`);
    }
    fens.push(game.fen());
  }
  if (result !== '*') game.setHeader('Result', result);
  return { fens, pgn: game.pgn() };
}

export function observeMoveList(
  doc: Document,
  onChange: (data: ParsedMoveList) => void,
): MutationObserver {
  const root = doc.querySelector('.round__app') ?? doc.body;
  let seenPlyCount = 0;

  const observer = new MutationObserver(() => {
    const data = parseMoveList(doc);
    if (!data) return;
    if (data.plies.length !== seenPlyCount) {
      seenPlyCount = data.plies.length;
      onChange(data);
    }
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return observer;
}
