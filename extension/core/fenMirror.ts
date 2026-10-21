import { splitFen } from './fenFields';

function swapPieceCase(ch: string): string {
  if (ch >= 'A' && ch <= 'Z') return ch.toLowerCase();
  if (ch >= 'a' && ch <= 'z') return ch.toUpperCase();
  return ch;
}

function mirrorRankDigit(rankChar: string): string {
  return String(9 - Number(rankChar));
}

export function mirrorFen(fen: string): string {
  const { placement, castling, ep, halfmove, fullmove } = splitFen(fen);

  const mirroredPlacement = placement
    .split('/')
    .reverse()
    .map((rank) => rank.split('').map(swapPieceCase).join(''))
    .join('/');

  const mirroredCastling = castling === '-' ? '-' : castling.split('').map(swapPieceCase).join('');

  const mirroredEp = ep === '-' ? '-' : ep.charAt(0) + mirrorRankDigit(ep.charAt(1));

  return [mirroredPlacement, 'w', mirroredCastling, mirroredEp, halfmove, fullmove].join(' ');
}

export function mirrorSquare(square: string): string {
  return square.charAt(0) + mirrorRankDigit(square.charAt(1));
}

export function mirrorMoveUci(moveUci: string): string {
  const from = moveUci.slice(0, 2);
  const to = moveUci.slice(2, 4);
  const promotion = moveUci.slice(4);
  return mirrorSquare(from) + mirrorSquare(to) + promotion;
}

export function sideToMove(fen: string): 'w' | 'b' {
  const { turn } = splitFen(fen);
  if (turn !== 'w' && turn !== 'b') {
    throw new Error(`Invalid FEN side-to-move field: ${turn}`);
  }
  return turn;
}

export function toWhitePerspectiveFen(fen: string): { fen: string; wasMirrored: boolean } {
  const turn = sideToMove(fen);
  if (turn === 'w') return { fen, wasMirrored: false };
  return { fen: mirrorFen(fen), wasMirrored: true };
}
