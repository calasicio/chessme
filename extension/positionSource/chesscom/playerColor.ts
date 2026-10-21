export function detectPlayerColor(board: Element): 'w' | 'b' {
  return board.classList.contains('flipped') ? 'b' : 'w';
}
