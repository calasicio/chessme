export const FILES = 'abcdefgh';

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

const SQUARE_CLASS = /^square-([1-8])([1-8])$/;

export function readSquareClass(el: Element): FileRank | null {
  for (const className of el.classList) {
    const match = SQUARE_CLASS.exec(className);
    if (match) return { file: Number(match[1]), rank: Number(match[2]) };
  }
  return null;
}

export function squareClassName(file: number, rank: number): string {
  return `square-${file}${rank}`;
}
