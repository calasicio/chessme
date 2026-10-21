import type { Orientation } from './squares';

export function getOrientation(board: Element): Orientation {
  if (board.classList.contains('orientation-black')) return 'black';
  return 'white';
}

export function detectPlayerColor(board: Element): 'w' | 'b' {
  return getOrientation(board) === 'black' ? 'b' : 'w';
}
