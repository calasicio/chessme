export const FILES = 'abcdefgh';

export type Orientation = 'white' | 'black';

export interface FileRank {
  file: number;
  rank: number;
}

export function squareName(file: number, rank: number): string {
  const letter = FILES[file - 1];
  if (!letter || rank < 1 || rank > 8) {
    throw new Error(`Invalid file/rank: ${file}/${rank}`);
  }
  return letter + rank;
}

export function parseSquareName(square: string): FileRank {
  const file = FILES.indexOf(square[0] ?? '') + 1;
  const rank = Number(square[1]);
  if (file < 1 || !(rank >= 1 && rank <= 8)) {
    throw new Error(`Invalid square name: ${square}`);
  }
  return { file, rank };
}

export function pixelToSquare(
  x: number,
  y: number,
  squareSizePx: number,
  orientation: Orientation,
): string {
  const fileIndex0 = Math.round(x / squareSizePx);
  const rankIndex0 = Math.round(y / squareSizePx);
  if (orientation === 'white') {
    return squareName(fileIndex0 + 1, 8 - rankIndex0);
  }
  return squareName(7 - fileIndex0 + 1, rankIndex0 + 1);
}

export function squareToPixel(
  square: string,
  squareSizePx: number,
  orientation: Orientation,
): { x: number; y: number } {
  const { file, rank } = parseSquareName(square);
  const fileIndex0 = file - 1;
  const rankIndex0 = rank - 1;
  if (orientation === 'white') {
    return { x: fileIndex0 * squareSizePx, y: (7 - rankIndex0) * squareSizePx };
  }
  return { x: (7 - fileIndex0) * squareSizePx, y: rankIndex0 * squareSizePx };
}

export function parseTranslate(transform: string): { x: number; y: number } | null {
  const match = /translate\(\s*(-?[\d.]+)px\s*(?:,\s*(-?[\d.]+)px\s*)?\)/.exec(transform);
  if (!match) return null;
  return { x: Number(match[1]), y: match[2] !== undefined ? Number(match[2]) : 0 };
}

export function squareToSvgCenter(
  square: string,
  orientation: Orientation,
): { x: number; y: number } {
  const { file, rank } = parseSquareName(square);
  const fileIndex0 = file - 1;
  const rankIndex0 = rank - 1;
  if (orientation === 'white') {
    return { x: fileIndex0 - 3.5, y: 3.5 - rankIndex0 };
  }
  return { x: 3.5 - fileIndex0, y: rankIndex0 - 3.5 };
}
