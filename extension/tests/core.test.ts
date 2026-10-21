import { describe, expect, it } from 'vitest';
import { BOARD_TENSOR_LENGTH, boardToTensor } from '@/core/boardTensor';
import { ELO_BUCKET_OPTIONS, findEloBucketOption, mapToEloCategory } from '@/core/eloBuckets';
import { mirrorFen, mirrorMoveUci, toWhitePerspectiveFen } from '@/core/fenMirror';
import { MOVE_VOCAB, MOVE_VOCAB_SIZE, legalMoveIndices, moveUciToIndex } from '@/core/moveVocab';

describe('eloBuckets', () => {
  it.each([
    [1099, 0],
    [1100, 1],
    [1199, 1],
    [1200, 2],
    [1999, 9],
    [2000, 10],
    [2800, 10],
    [0, 0],
  ])('maps elo %i to bucket %i', (elo, expected) => {
    expect(mapToEloCategory(elo)).toBe(expected);
  });

  it('has exactly 11 bucket options, index-aligned with mapToEloCategory', () => {
    expect(ELO_BUCKET_OPTIONS).toHaveLength(11);
    for (const option of ELO_BUCKET_OPTIONS) {
      expect(mapToEloCategory(option.value)).toBe(ELO_BUCKET_OPTIONS.indexOf(option));
    }
  });

  it('findEloBucketOption resolves an off-grid value to the bucket it actually falls in', () => {
    expect(findEloBucketOption(1537).label).toBe('1500-1599');
    expect(findEloBucketOption(50).label).toBe('<1100');
    expect(findEloBucketOption(2750).label).toBe('>=2000');
  });
});

describe('moveVocab', () => {
  it('has exactly 1880 unique moves', () => {
    expect(MOVE_VOCAB_SIZE).toBe(1880);
    expect(new Set(MOVE_VOCAB).size).toBe(1880);
  });

  it('round-trips uci <-> index', () => {
    const index = moveUciToIndex('e2e4');
    expect(MOVE_VOCAB[index]).toBe('e2e4');
  });

  it('finds all 20 legal opening moves', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(legalMoveIndices(fen)).toHaveLength(20);
  });
});

describe('fenMirror', () => {
  const startpos = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('leaves White-to-move positions untouched', () => {
    const { fen, wasMirrored } = toWhitePerspectiveFen(startpos);
    expect(fen).toBe(startpos);
    expect(wasMirrored).toBe(false);
  });

  it('mirrors a Black-to-move position to White-to-move, swapping colors and castling', () => {
    const blackToMove = 'r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1';
    const { fen, wasMirrored } = toWhitePerspectiveFen(blackToMove);
    expect(wasMirrored).toBe(true);
    const [placement, turn, castling, ep, halfmove, fullmove] = fen.split(' ');
    expect(placement).toBe('r3k2r/8/8/8/8/8/8/R3K2R');
    expect(turn).toBe('w');
    expect(new Set(castling)).toEqual(new Set('KQkq'));
    expect(ep).toBe('-');
    expect(halfmove).toBe('0');
    expect(fullmove).toBe('1');
  });

  it('flips the en passant target rank only, keeping the file', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const mirrored = mirrorFen(fen);
    expect(mirrored.split(' ')[3]).toBe('e6');
  });

  it('mirroring is its own inverse on castling-only positions', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    expect(mirrorFen(mirrorFen(fen))).toBe(fen);
  });

  it('un-mirrors a move uci by flipping rank only', () => {
    expect(mirrorMoveUci('e2e4')).toBe('e7e5');
    expect(mirrorMoveUci('a7a8q')).toBe('a2a1q');
  });
});

describe('boardToTensor', () => {
  it('produces an 18x8x8 tensor', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(boardToTensor(fen)).toHaveLength(BOARD_TENSOR_LENGTH);
  });

  it('places the White king plane at e1 (row 0, col 4)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const tensor = boardToTensor(fen);
    const kingChannel = 5;
    expect(tensor[kingChannel * 64 + 0 * 8 + 4]).toBe(1);
  });

  it('fills the side-to-move plane fully when White is to move, empty when Black', () => {
    const whiteToMove = boardToTensor('8/8/8/3k4/3K4/8/8/8 w - - 0 1');
    const blackToMove = boardToTensor('8/8/8/3k4/3K4/8/8/8 b - - 0 1');
    const turnChannelBase = 12 * 64;
    expect(whiteToMove[turnChannelBase]).toBe(1);
    expect(blackToMove[turnChannelBase]).toBe(0);
  });
});
