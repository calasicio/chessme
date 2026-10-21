import { getOrientation } from './playerColor';
import { parseTranslate, pixelToSquare, squareName, type Orientation } from './squares';

const PIECE_COLOR_TYPE = /^(white|black)\s+(pawn|knight|bishop|rook|queen|king)$/;
const PIECE_LETTER: Record<string, string> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

export interface LichessHighlight {
  square: string;
  kind: string;
}

export interface LichessShape {
  squares: string[];
  color: string;
}

export interface ParsedLichessBoard {
  placement: string;
  orientation: Orientation;
  lastMove: { from: string; to: string } | null;
  shapes: LichessShape[];
}

function getSquareSizePx(board: Element): number {
  const container = board.querySelector<HTMLElement>('cg-container');
  const width = container?.style.width ? parseFloat(container.style.width) : NaN;
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('Could not determine board size from <cg-container> width.');
  }
  return width / 8;
}

function parseCgHash(hash: string): LichessShape | null {
  const tokens = hash.split(',');
  const squares = tokens.filter((t) => /^[a-h][1-8]$/.test(t));
  const color = tokens.find((t) => ['green', 'red', 'yellow', 'blue'].includes(t));
  if (!color || squares.length === 0) return null;
  return { squares, color };
}

export function parseBoard(board: Element): ParsedLichessBoard {
  const orientation = getOrientation(board);
  const squareSizePx = getSquareSizePx(board);

  const grid = new Map<string, string>();
  for (const el of board.querySelectorAll<HTMLElement>('piece')) {
    if (el.classList.contains('ghost')) continue;
    const match = PIECE_COLOR_TYPE.exec(el.className.trim());
    const offset = parseTranslate(el.style.transform);
    if (!match || !offset) continue;
    const [, color, type] = match;
    const square = pixelToSquare(offset.x, offset.y, squareSizePx, orientation);
    const letter = PIECE_LETTER[type!]!;
    grid.set(square, color === 'white' ? letter.toUpperCase() : letter);
  }

  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (let file = 1; file <= 8; file++) {
      const piece = grid.get(squareName(file, rank));
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      row += piece;
    }
    if (empty) row += empty;
    rows.push(row);
  }

  const lastMoveSquares: string[] = [];
  for (const el of board.querySelectorAll<HTMLElement>('square.last-move')) {
    const offset = parseTranslate(el.style.transform);
    if (!offset) continue;
    lastMoveSquares.push(pixelToSquare(offset.x, offset.y, squareSizePx, orientation));
  }

  const to = lastMoveSquares.find((sq) => grid.has(sq));
  const from = lastMoveSquares.find((sq) => sq !== to);

  const shapes: LichessShape[] = [];
  for (const el of board.querySelectorAll<SVGGElement>('svg.cg-shapes g')) {
    const hash = el.getAttribute('cgHash') ?? el.getAttribute('cghash');
    const shape = hash ? parseCgHash(hash) : null;
    if (shape) shapes.push(shape);
  }

  return {
    placement: rows.join('/'),
    orientation,
    lastMove: from && to ? { from, to } : null,
    shapes,
  };
}
