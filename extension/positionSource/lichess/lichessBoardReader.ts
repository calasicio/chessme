import type { FenSource, PositionSource } from '../PositionSource';
import { parseBoard } from './boardParser';
import { parseMoveList, replay } from './moveListParser';
import { getOrientation } from './playerColor';
import { findLichessBoard, findLichessMoveList, hasLichessBoard } from './presence';

const DEFAULT_ELO = 1500;
const RATING_PATTERN = /(\d{3,4})/;

export type { FenSource };

export class LichessPositionSourceError extends Error {}

export class LichessPositionSource implements PositionSource {
  lastFenSource: FenSource | null = null;

  constructor(
    private readonly doc: ParentNode,
    private readonly eloSelfValue: number = DEFAULT_ELO,
    private readonly eloOppoOverride?: number,
  ) {}

  getFen(): string {
    const moveList = findLichessMoveList(this.doc);
    if (moveList) {
      const parsed = parseMoveList(this.doc);
      if (parsed && parsed.plies.length > 0) {
        const { fens } = replay(parsed);
        this.lastFenSource = 'replay';
        return fens[parsed.viewing] ?? fens.at(-1)!;
      }
    }

    const board = findLichessBoard(this.doc);
    if (!board) {
      throw new LichessPositionSourceError('No lichess board or move list found on this page.');
    }
    const { placement } = parseBoard(board);
    this.lastFenSource = 'board-only';
    return `${placement} w KQkq - 0 1`;
  }

  getEloSelf(): number {
    return this.eloSelfValue;
  }

  getEloOppo(): number {
    if (this.eloOppoOverride !== undefined) return this.eloOppoOverride;

    const board = findLichessBoard(this.doc);
    const myColor = board ? getOrientation(board) : 'white';
    const opponentColor = myColor === 'white' ? 'black' : 'white';
    const opponentBlock = this.doc.querySelector(
      `.game__meta__players .player.is.${opponentColor}`,
    );
    const match = opponentBlock?.querySelector('.rating')?.textContent?.match(RATING_PATTERN);
    return match ? Number(match[1]) : DEFAULT_ELO;
  }
}

export function isLichessGamePage(root: ParentNode): boolean {
  return hasLichessBoard(root);
}
