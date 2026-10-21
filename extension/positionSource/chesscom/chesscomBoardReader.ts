import type { FenSource, PositionSource } from '../PositionSource';
import { parseBoard } from './boardParser';
import { parseMoveList, replay } from './moveListParser';
import { findChesscomBoard, findChesscomMoveList, hasChesscomBoard } from './presence';

const DEFAULT_ELO = 1500;

const RATING_PATTERN = /\((\d{2,4})\)/;

export type { FenSource };

export class ChesscomPositionSourceError extends Error {}

export class ChesscomPositionSource implements PositionSource {
  lastFenSource: FenSource | null = null;

  constructor(
    private readonly doc: ParentNode,
    private readonly eloSelfValue: number = DEFAULT_ELO,
    private readonly eloOppoOverride?: number,
  ) {}

  getFen(): string {
    const moveList = findChesscomMoveList(this.doc);
    if (moveList) {
      const parsed = parseMoveList(this.doc);
      if (parsed && parsed.plies.length > 0) {
        const { fens } = replay(parsed);
        this.lastFenSource = 'replay';
        return fens[parsed.viewing] ?? fens.at(-1)!;
      }
    }

    const board = findChesscomBoard(this.doc);
    if (!board) {
      throw new ChesscomPositionSourceError(
        'No <wc-chess-board> or <wc-simple-move-list> found on this page.',
      );
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
    const topPlayer = this.doc.querySelector('#board-layout-player-top');
    const match = topPlayer?.textContent ? RATING_PATTERN.exec(topPlayer.textContent) : null;
    return match ? Number(match[1]) : DEFAULT_ELO;
  }
}

export function isChesscomPlayPage(root: ParentNode): boolean {
  return hasChesscomBoard(root);
}
