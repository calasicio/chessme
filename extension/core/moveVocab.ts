import { Chess } from 'chess.js';
import moveVocabJson from './data/move-vocab.json';

export const MOVE_VOCAB: readonly string[] = moveVocabJson as string[];
export const MOVE_VOCAB_SIZE = MOVE_VOCAB.length;

const UCI_TO_INDEX: ReadonlyMap<string, number> = new Map(
  MOVE_VOCAB.map((uci, index) => [uci, index]),
);

export function moveUciToIndex(uci: string): number {
  const index = UCI_TO_INDEX.get(uci);
  if (index === undefined) {
    throw new Error(`Move "${uci}" is not in Maia2's move vocabulary`);
  }
  return index;
}

export function indexToMoveUci(index: number): string {
  const uci = MOVE_VOCAB[index];
  if (uci === undefined) {
    throw new Error(`Move index ${index} is out of range [0, ${MOVE_VOCAB_SIZE})`);
  }
  return uci;
}

export function legalMoveIndices(fen: string): number[] {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) {
    throw new Error(`Cannot run inference on a position without legal moves: ${fen}`);
  }
  return moves.map((move) => moveUciToIndex(move.from + move.to + (move.promotion ?? '')));
}
