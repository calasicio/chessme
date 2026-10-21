import { FILES, parseSquareName, readSquareClass, squareName } from './squares';

const PIECE_CLASS = /^[wb][pnbrqk]$/;
const LAST_MOVE_COLOR = 'rgb(255, 255, 51)';
const LAST_MOVE_OPACITY = 0.5;

export interface BoardHighlight {
  square: string;
  color: string;
  opacity: number;
}

export interface BoardArrow {
  from: string;
  to: string;
  color: string;
}

export interface ParsedBoard {
  placement: string;
  lastMove: { from: string; to: string } | null;
  highlights: BoardHighlight[];
  arrows: BoardArrow[];
}

function readPieceType(el: Element): string | null {
  for (const className of el.classList) {
    if (PIECE_CLASS.test(className)) return className;
  }
  return null;
}

export function parseBoard(root: Element): ParsedBoard {
  const grid = new Map<string, string>();
  for (const el of root.querySelectorAll('.piece')) {
    const square = readSquareClass(el);
    const type = readPieceType(el);
    if (square && type) grid.set(squareName(square.file, square.rank), type);
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
      const [color, type] = piece;
      row += color === 'w' ? type!.toUpperCase() : type;
    }
    if (empty) row += empty;
    rows.push(row);
  }

  const highlights: BoardHighlight[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('.highlight')) {
    const square = readSquareClass(el);
    if (!square) continue;
    highlights.push({
      square: squareName(square.file, square.rank),
      color: el.style.backgroundColor,
      opacity: Number(el.style.opacity || '1'),
    });
  }

  const isLastMoveHighlight = (h: BoardHighlight) =>
    h.color === LAST_MOVE_COLOR && h.opacity === LAST_MOVE_OPACITY;
  const lastMoveSquares = highlights.filter(isLastMoveHighlight).map((h) => h.square);

  const to = lastMoveSquares.find((sq) => grid.has(sq));
  const from = lastMoveSquares.find((sq) => sq !== to);

  const arrows: BoardArrow[] = [];
  for (const el of root.querySelectorAll<SVGPolygonElement>('polygon.arrow')) {
    const raw = el.dataset.arrow ?? '';
    const match = /^([a-h][1-8])([a-h][1-8])$/.exec(raw);
    if (!match) continue;
    arrows.push({ from: match[1]!, to: match[2]!, color: el.style.fill });
  }

  return {
    placement: rows.join('/'),
    lastMove: from && to ? { from, to } : null,
    highlights: highlights.filter((h) => !isLastMoveHighlight(h)),
    arrows,
  };
}

export { FILES, parseSquareName, squareName };
