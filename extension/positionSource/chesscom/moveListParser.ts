import { Chess } from 'chess.js';

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

export function readSan(content: Element): string {
  let san = '';
  for (const node of content.childNodes) {
    if (node.nodeType === 3) {
      san += node.textContent ?? '';
    } else if (node.nodeType === 1) {
      const figurine = (node as Element).getAttribute('data-figurine');
      if (figurine) san += figurine;
    }
  }
  return san.replace(/\s+/g, '').replace(/[?!]+$/, '');
}

export function parseMoveList(root: ParentNode): ParsedMoveList | null {
  const list = root.querySelector('wc-simple-move-list');
  if (!list) return null;

  const plies: Ply[] = [];
  for (const el of list.querySelectorAll('.main-line-ply[data-node]')) {
    const content = el.querySelector('.node-highlight-content');
    if (!content) continue;
    const dataNode = el.getAttribute('data-node') ?? '';
    const plyIndex = Number(dataNode.split('-')[1]);
    const san = readSan(content);
    if (!san) continue;
    plies.push({
      ply: plyIndex + 1,
      color: el.classList.contains('white-move') ? 'w' : 'b',
      san,
      selected: content.classList.contains('selected'),
    });
  }
  plies.sort((a, b) => a.ply - b.ply);

  const result = list.querySelector('.game-result')?.textContent?.trim() || '*';
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
  const root = doc.querySelector('#scroll-container')?.parentElement ?? doc.body;
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
