import type { MaiaPrediction } from '@/core/maiaSession';
import { addArrow } from './arrowGenerator';

export const MAIA_ARROW_CLASS = 'maia2-suggestion';

function hexToRgba(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function clearMaiaArrows(board: Element): void {
  for (const el of board.querySelectorAll(`svg.arrows polygon.${MAIA_ARROW_CLASS}`)) {
    el.remove();
  }
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
): SVGPolygonElement[] {
  const { topN = 3, minOpacity = 0.25, color = DEFAULT_COLOR, role } = options;
  clearMaiaArrows(board);

  return prediction.moves.slice(0, topN).map((move) => {
    const opacity = Math.max(minOpacity, move.probability);
    const arrow = addArrow(
      board,
      move.uci.slice(0, 2),
      move.uci.slice(2, 4),
      hexToRgba(color, opacity),
    );
    arrow.classList.add(MAIA_ARROW_CLASS);
    arrow.dataset.maiaProbability = move.probability.toFixed(4);
    if (role) arrow.dataset.maiaRole = role;
    return arrow;
  });
}
