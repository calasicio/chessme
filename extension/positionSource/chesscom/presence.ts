export function findChesscomBoard(root: ParentNode): Element | null {
  return root.querySelector('wc-chess-board');
}

export function findChesscomMoveList(root: ParentNode): Element | null {
  return root.querySelector('wc-simple-move-list');
}

export function hasChesscomBoard(root: ParentNode): boolean {
  return findChesscomBoard(root) !== null;
}

export function hasChesscomMoveList(root: ParentNode): boolean {
  return findChesscomMoveList(root) !== null;
}
