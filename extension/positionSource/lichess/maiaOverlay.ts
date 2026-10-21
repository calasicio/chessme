import type { MaiaPrediction } from '@/core/maiaSession';
import { addArrow, clearOverlay } from './arrowGenerator';

export const MAIA_ARROW_CLASS = 'maia2-arrow-line';

export function clearMaiaArrows(board: Element): void {
  clearOverlay(board);
}

export interface DrawMaiaSuggestionsOptions {
  topN?: number;
  minOpacity?: number;
  color?: string;
  role?: 'self' | 'opponent';
}

const DEFAULT_COLOR = '#9333EA';

export function drawMaiaSuggestions(
  board: Element,
  prediction: MaiaPrediction,
  options: DrawMaiaSuggestionsOptions = {},
): SVGLineElement[] {
  const { topN = 3, minOpacity = 0.25, color = DEFAULT_COLOR, role } = options;
  clearMaiaArrows(board);

  return prediction.moves.slice(0, topN).map((move) => {
    const opacity = Math.max(minOpacity, move.probability);
    const line = addArrow(board, move.uci.slice(0, 2), move.uci.slice(2, 4), color, opacity);
    if (role) line.dataset.maiaRole = role;
    line.dataset.maiaProbability = move.probability.toFixed(4);
    return line;
  });
}
