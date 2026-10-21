import { splitFen } from './fenFields';

const PIECE_CHANNEL: Record<string, number> = {
  p: 0,
  n: 1,
  b: 2,
  r: 3,
  q: 4,
  k: 5,
};

export const BOARD_CHANNELS = 18;
export const BOARD_SIZE = 8;
export const BOARD_TENSOR_LENGTH = BOARD_CHANNELS * BOARD_SIZE * BOARD_SIZE;

function setPlane(tensor: Float32Array, channel: number, row: number, col: number, value = 1) {
  tensor[channel * 64 + row * 8 + col] = value;
}

function fillPlane(tensor: Float32Array, channel: number, value = 1) {
  const base = channel * 64;
  for (let i = 0; i < 64; i++) tensor[base + i] = value;
}

export function boardToTensor(fen: string): Float32Array {
  const { placement, turn, castling, ep } = splitFen(fen);
  const tensor = new Float32Array(BOARD_TENSOR_LENGTH);

  const ranksTopToBottom = placement.split('/');
  if (ranksTopToBottom.length !== 8) {
    throw new Error(`Invalid FEN placement field: ${placement}`);
  }

  ranksTopToBottom.forEach((rankStr, rankStrIndex) => {
    const row = 7 - rankStrIndex;
    let col = 0;
    for (const ch of rankStr) {
      if (ch >= '1' && ch <= '8') {
        col += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      const pieceChannel = PIECE_CHANNEL[lower];
      if (pieceChannel === undefined) {
        throw new Error(`Invalid piece character in FEN: ${ch}`);
      }
      const isWhite = ch === ch.toUpperCase();
      const channel = pieceChannel + (isWhite ? 0 : 6);
      setPlane(tensor, channel, row, col);
      col += 1;
    }
    if (col !== 8) {
      throw new Error(`FEN rank does not sum to 8 files: ${rankStr}`);
    }
  });

  if (turn === 'w') fillPlane(tensor, 12);

  if (castling.includes('K')) fillPlane(tensor, 13);
  if (castling.includes('Q')) fillPlane(tensor, 14);
  if (castling.includes('k')) fillPlane(tensor, 15);
  if (castling.includes('q')) fillPlane(tensor, 16);

  if (ep !== '-') {
    const file = ep.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = Number(ep.charAt(1)) - 1;
    setPlane(tensor, 17, rank, file);
  }

  return tensor;
}
