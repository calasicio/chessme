export function findLichessBoard(root: ParentNode): Element | null {
  return root.querySelector('.cg-wrap');
}

export function findLichessMoveList(root: ParentNode): Element | null {
  return root.querySelector('.round__app app');
}

export function hasLichessBoard(root: ParentNode): boolean {
  return findLichessBoard(root) !== null;
}

export function hasLichessMoveList(root: ParentNode): boolean {
  return findLichessMoveList(root) !== null;
}
