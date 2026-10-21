import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  addArrow,
  addHighlight,
  computeArrowGeometry,
  pointsAttr,
} from '@/positionSource/chesscom/arrowGenerator';
import { parseBoard } from '@/positionSource/chesscom/boardParser';
import { parseMoveList, readSan, replay, toPGN } from '@/positionSource/chesscom/moveListParser';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures/chesscom');

function loadDom(file: string): Document {
  const html = readFileSync(path.join(FIXTURES, file), 'utf-8');
  return new JSDOM(html).window.document;
}

describe('boardParser', () => {
  const doc = loadDom('board-with-arrows.html');
  const board = doc.querySelector('wc-chess-board')!;
  const parsed = parseBoard(board);

  it('places pieces by their square-FR class, not DOM order', () => {
    const rows = parsed.placement.split('/');
    expect(rows).toHaveLength(8);
    expect(rows[7]).toContain('K');
  });

  it('excludes element-pool placeholders', () => {
    expect(() => parsed.placement).not.toThrow();
    for (const row of parsed.placement.split('/')) {
      const sum = row.split('').reduce((n, ch) => n + (/\d/.test(ch) ? Number(ch) : 1), 0);
      expect(sum).toBe(8);
    }
  });

  it('separates the last-move highlight from real annotation highlights', () => {
    expect(parsed.highlights).toHaveLength(5);
    expect(parsed.highlights.every((h) => h.color !== 'rgb(255, 255, 51)')).toBe(true);
  });

  it('resolves last move from the two yellow squares via the occupied-square heuristic', () => {
    expect(parsed.lastMove).toEqual({ from: 'a5', to: 'b4' });
  });

  it('reads all 38 arrows from the fixture', () => {
    expect(parsed.arrows).toHaveLength(38);
  });
});

describe('arrowGenerator geometry, verified against real captured arrows', () => {
  const doc = loadDom('board-with-arrows.html');
  const board = doc.querySelector('wc-chess-board')!;
  const parsed = parseBoard(board);
  const realPolygons = new Map(
    [...board.querySelectorAll('polygon.arrow')].map((el) => [
      el.getAttribute('data-arrow')!,
      { points: el.getAttribute('points')!, transform: el.getAttribute('transform')! },
    ]),
  );

  it.each(parsed.arrows)(
    'regenerates $from$to identically (points exact, rotation within 0.01deg)',
    ({ from, to }) => {
      const geometry = computeArrowGeometry(from, to);
      const real = realPolygons.get(from + to)!;
      expect(real).toBeDefined();
      expect(pointsAttr(geometry.points)).toBe(real.points);

      const realMatch = /rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)(.*)$/.exec(real.transform)!;
      const [, realDeg, realPx, realPy, realRest] = realMatch;
      expect(Number(realDeg)).toBeCloseTo(geometry.rotationDeg, 1);
      expect(realPx).toBe(String(geometry.pivot[0]));
      expect(realPy).toBe(String(geometry.pivot[1]));
      expect(realRest!.includes('scale(-1, 1)')).toBe(geometry.mirrored);
    },
  );

  it('classifies all 8 real knight-move arrows (every knight destination from d4) with the documented mirror pattern', () => {
    const knightArrows = parsed.arrows.filter((a) => computeArrowGeometry(a.from, a.to).isKnight);
    expect(knightArrows.map((a) => a.from + a.to).sort()).toEqual(
      ['d4b3', 'd4b5', 'd4c2', 'd4c6', 'd4e2', 'd4e6', 'd4f3', 'd4f5'].sort(),
    );
    const mirrored = knightArrows
      .filter((a) => computeArrowGeometry(a.from, a.to).mirrored)
      .map((a) => a.from + a.to)
      .sort();
    expect(mirrored).toEqual(['d4b5', 'd4c2', 'd4e6', 'd4f3'].sort());
  });

  it('injects a highlight and an arrow matching the same geometry/markup conventions', () => {
    const doc2 = loadDom('board-with-arrows.html');
    const board2 = doc2.querySelector('wc-chess-board')!;
    const highlight = addHighlight(board2, 'c5', 'rgb(235, 97, 80)', 0.8);
    expect(highlight.className).toBe('highlight square-35');
    expect(board2.querySelector('.piece')!.previousElementSibling).toBe(highlight);

    const arrow = addArrow(board2, 'e1', 'd2');
    expect(arrow.id).toBe('arrow-e1d2');
    expect(board2.querySelector('svg.arrows polygon#arrow-e1d2')).toBe(arrow);
  });
});

describe('moveListParser: 36-move castling game (no promotion)', () => {
  const doc = loadDom('movelist-castling.html');
  const data = parseMoveList(doc)!;

  it('parses all 72 plies', () => {
    expect(data.plies).toHaveLength(72);
  });

  it('reconstructs figurine-prefixed captures correctly (e.g. Nxe3, Bxc6+)', () => {
    expect(data.plies[19]!.san).toBe('Nxe3');
    expect(data.plies[28]!.san).toBe('Bxc6+');
  });

  it('is still in progress (no .game-result element)', () => {
    expect(data.over).toBe(false);
    expect(data.result).toBe('*');
  });

  it('tracks the currently-selected ply', () => {
    expect(data.viewing).toBe(72);
    expect(data.plies.at(-1)!.san).toBe('Kb4');
  });

  it('produces the exact PGN from the opening-explorer link', () => {
    expect(toPGN(data)).toBe(
      '1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Bb5 a6 5. O-O Be7 6. Qe2 a5 7. Qe3 Rf8 8. d3 g6 ' +
        '9. b3 Nd5 10. Ba3 Nxe3 11. fxe3 Rg8 12. Bxe7 Qxe7 13. Nxe5 Qd6 14. Nxc6 dxc6 ' +
        '15. Bxc6+ Qd7 16. e5 Ra6 17. d4 Rxc6 18. d5 Qg4 19. dxc6 Qxg2+ 20. Kxg2 Kd8 ' +
        '21. cxb7 Bxb7+ 22. e4 Ba6 23. Rfd1+ Ke7 24. Nd5+ Kd8 25. Nxc7+ Kxc7 26. Rd6 h5 ' +
        '27. Rxa6 h4 28. h3 Rd8 29. Rxa5 Rd2+ 30. Kh1 f6 31. Ra4 fxe5 32. Rc4+ Kb6 ' +
        '33. a4 Rxc2 34. Kg1 Rxc4 35. Kf1 Ka5 36. bxc4 Kb4 *',
    );
  });

  it('replays cleanly through chess.js end to end', () => {
    const { fens } = replay(data);
    expect(fens).toHaveLength(73);
    expect(fens[0]).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    expect(fens[9]!.split(' ')[2]).not.toContain('K');
  });
});

describe('moveListParser: promotion + checkmate', () => {
  const doc = loadDom('movelist-promotion-checkmate.html');
  const data = parseMoveList(doc)!;

  it('parses all 87 plies (44 White, 43 Black)', () => {
    expect(data.plies).toHaveLength(87);
    expect(data.plies.filter((p) => p.color === 'w')).toHaveLength(44);
  });

  it('reads the pawn promotion as plain text, no figurine involved', () => {
    const promotion = data.plies.find((p) => p.ply === 79)!;
    expect(promotion.san).toBe('a8=Q');
  });

  it('reads checkmate notation with its figurine prefix intact', () => {
    const mate = data.plies.at(-1)!;
    expect(mate.san).toBe('Qa8#');
    expect(mate.color).toBe('w');
  });

  it('reports the game as over with the correct result', () => {
    expect(data.over).toBe(true);
    expect(data.result).toBe('1-0');
  });

  it('replays the promotion and checkmate through chess.js without throwing', () => {
    const { fens, pgn } = replay(data);
    expect(fens).toHaveLength(88);
    expect(pgn).toContain('1-0');

    const afterPromotion = fens[79]!.split(' ')[0];
    expect(afterPromotion!.split('/')[0]).toMatch(/^Q/);
  });
});

describe('readSan edge cases', () => {
  function contentFromHtml(html: string): Element {
    const doc = new JSDOM(`<span class="node-highlight-content">${html}</span>`).window.document;
    return doc.querySelector('.node-highlight-content')!;
  }

  it('strips annotation marks but keeps check/mate symbols', () => {
    expect(readSan(contentFromHtml(' e4!? '))).toBe('e4');
    expect(readSan(contentFromHtml(' Qa8# '))).toBe('Qa8#');
    expect(readSan(contentFromHtml(' Bxc6+ '))).toBe('Bxc6+');
  });
});
