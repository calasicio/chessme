import { evaluatePosition, type MaiaPrediction } from '@/core/maiaSession';
import type { MaiaOrtSession } from '@/core/ortTypes';
import { ChesscomPositionSource, type FenSource } from './chesscomBoardReader';
import { drawMaiaSuggestions, type DrawMaiaSuggestionsOptions } from './maiaOverlay';
import { findChesscomBoard, hasChesscomBoard, hasChesscomMoveList } from './presence';

export interface RunMaiaOnChesscomOptions extends DrawMaiaSuggestionsOptions {
  eloSelf?: number;
  eloOppo?: number;
}

export interface RunMaiaOnChesscomResult {
  prediction: MaiaPrediction;
  fen: string;
  fenSource: FenSource;
}

export async function runMaiaOnChesscom(
  session: MaiaOrtSession,
  doc: ParentNode,
  options: RunMaiaOnChesscomOptions = {},
): Promise<RunMaiaOnChesscomResult | null> {
  const board = findChesscomBoard(doc);
  if (!board) return null;

  if (!hasChesscomMoveList(doc)) {
    console.warn(
      '[maia2] No move list found — falling back to a board-only FEN. ' +
        'Castling rights and en passant will be guessed, not exact.',
    );
  }

  const source = new ChesscomPositionSource(doc, options.eloSelf, options.eloOppo);
  const fen = source.getFen();

  let prediction;
  try {
    prediction = await evaluatePosition(session, fen, source.getEloSelf(), source.getEloOppo());
  } catch (error) {
    console.warn('[maia2] could not evaluate position, nothing to suggest:', error);
    return null;
  }

  drawMaiaSuggestions(board, prediction, options);

  return { prediction, fen, fenSource: source.lastFenSource! };
}

export { hasChesscomBoard, hasChesscomMoveList };
