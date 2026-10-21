import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { addArrow } from '@/positionSource/lichess/arrowGenerator';
import { parseBoard } from '@/positionSource/lichess/boardParser';
import { LichessPositionSource } from '@/positionSource/lichess/lichessBoardReader';
import { parseMoveList, replay, toPGN } from '@/positionSource/lichess/moveListParser';
import { getOrientation, detectPlayerColor } from '@/positionSource/lichess/playerColor';
import { hasLichessBoard, hasLichessMoveList } from '@/positionSource/lichess/presence';
import { pixelToSquare, squareToSvgCenter } from '@/positionSource/lichess/squares';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures/lichess');

function loadDom(file: string): Document {
  const html = readFileSync(path.join(FIXTURES, file), 'utf-8');
  return new JSDOM(html).window.document;
}

describe('squares: pixel <-> square, verified against real captured pieces', () => {
  it('white orientation: file = x/sq, rank = 8 - y/sq', () => {
    expect(pixelToSquare(0, 0, 56, 'white')).toBe('a8');
    expect(pixelToSquare(280, 224, 56, 'white')).toBe('f4');
    expect(pixelToSquare(392, 392, 56, 'white')).toBe('h1');
  });

  it('black orientation: file = 7 - x/sq, rank = 1 + y/sq', () => {
    expect(pixelToSquare(392, 392, 56, 'black')).toBe('a8');
    expect(pixelToSquare(224, 168, 56, 'black')).toBe('d4');
    expect(pixelToSquare(0, 0, 56, 'black')).toBe('h1');
  });

  it("squareToSvgCenter matches chessground's own pos2user formula exactly (real sample: a1/b1/c1/d1 circles, white orientation)", () => {
    expect(squareToSvgCenter('a1', 'white')).toEqual({ x: -3.5, y: 3.5 });
    expect(squareToSvgCenter('b1', 'white')).toEqual({ x: -2.5, y: 3.5 });
    expect(squareToSvgCenter('d1', 'white')).toEqual({ x: -0.5, y: 3.5 });
  });

  it('squareToSvgCenter matches the real sample circle for black orientation (b5)', () => {
    expect(squareToSvgCenter('b5', 'black')).toEqual({ x: 2.5, y: 0.5 });
  });
});

describe('boardParser', () => {
  it('reads piece placement matching a chess.js replay of the actual game (white orientation)', () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;
    const parsed = parseBoard(board);
    expect(parsed.orientation).toBe('white');

    const chess = new Chess();
    for (const san of 'd4 Nf6 Bf4 g6 e3 d6 Nf3 Nd5 Bc4 c6 Nc3 Nxf4'.split(' ')) chess.move(san);
    expect(parsed.placement).toBe(chess.fen().split(' ')[0]);
  });

  it('reads piece placement matching a chess.js replay of the actual game (black orientation)', () => {
    const doc = loadDom('game-black.html');
    const board = doc.querySelector('.cg-wrap')!;
    const parsed = parseBoard(board);
    expect(parsed.orientation).toBe('black');

    const chess = new Chess();
    for (const san of 'd4 d5 Bf4 Nf6 e3 Nc6 Bd3 Bf5 Bxf5 e6 Bd3 Bd6 Ne2 Bxf4 exf4'.split(' '))
      chess.move(san);
    expect(parsed.placement).toBe(chess.fen().split(' ')[0]);
  });

  it('excludes the drag-preview ghost piece from placement', () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;
    const parsed = parseBoard(board);
    for (const row of parsed.placement.split('/')) {
      const sum = row.split('').reduce((n, ch) => n + (/\d/.test(ch) ? Number(ch) : 1), 0);
      expect(sum).toBe(8);
    }
  });

  it('resolves last move from the two last-move squares via the occupied-square heuristic', () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;

    expect(parseBoard(board).lastMove).not.toBeNull();
  });

  it('parses existing shapes (circles and arrows) from cgHash attributes', () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;
    const { shapes } = parseBoard(board);
    const circleA1 = shapes.find((s) => s.squares.length === 1 && s.squares[0] === 'a1');
    expect(circleA1).toEqual({ squares: ['a1'], color: 'green' });
    const arrowE1D2 = shapes.find((s) => s.squares.join('') === 'e1d2');
    expect(arrowE1D2).toEqual({ squares: ['e1', 'd2'], color: 'green' });
  });
});

describe('playerColor', () => {
  it('reports White for orientation-white', () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;
    expect(getOrientation(board)).toBe('white');
    expect(detectPlayerColor(board)).toBe('w');
  });

  it('reports Black for orientation-black', () => {
    const doc = loadDom('game-black.html');
    const board = doc.querySelector('.cg-wrap')!;
    expect(getOrientation(board)).toBe('black');
    expect(detectPlayerColor(board)).toBe('b');
  });
});

describe('presence', () => {
  it('detects a board and move list on a real game page', () => {
    const doc = loadDom('game-white.html');
    expect(hasLichessBoard(doc)).toBe(true);
    expect(hasLichessMoveList(doc)).toBe(true);
  });

  it('detects neither on an unrelated page', () => {
    const doc = new JSDOM('<html><body><p>not lichess</p></body></html>').window.document;
    expect(hasLichessBoard(doc)).toBe(false);
    expect(hasLichessMoveList(doc)).toBe(false);
  });
});

describe('moveListParser', () => {
  it('parses the white-perspective game (12 plies, ends on Nxf4)', () => {
    const doc = loadDom('game-white.html');
    const data = parseMoveList(doc)!;
    expect(data.plies).toHaveLength(12);
    expect(data.plies.at(-1)!.san).toBe('Nxf4');
    expect(data.plies.at(-1)!.selected).toBe(true);
    expect(toPGN(data)).toBe('1. d4 Nf6 2. Bf4 g6 3. e3 d6 4. Nf3 Nd5 5. Bc4 c6 6. Nc3 Nxf4 *');
  });

  it('parses the black-perspective game (15 plies, ends on exf4)', () => {
    const doc = loadDom('game-black.html');
    const data = parseMoveList(doc)!;
    expect(data.plies).toHaveLength(15);
    expect(data.plies.at(-1)!.san).toBe('exf4');
    expect(data.plies.at(-1)!.color).toBe('w');
  });

  it('replays both games cleanly through chess.js', () => {
    const doc1 = loadDom('game-white.html');
    const { fens: fens1 } = replay(parseMoveList(doc1)!);
    expect(fens1.at(-1)!.split(' ')[0]).toBe(
      'rnbqkb1r/pp2pp1p/2pp2p1/8/2BP1n2/2N1PN2/PPP2PPP/R2QK2R',
    );

    const doc2 = loadDom('game-black.html');
    const { fens: fens2 } = replay(parseMoveList(doc2)!);
    expect(fens2.at(-1)!.split(' ')[0]).toBe(
      'r2qk2r/ppp2ppp/2n1pn2/3p4/3P1P2/3B4/PPP1NPPP/RN1QK2R',
    );
  });
});

describe('LichessPositionSource', () => {
  it('prefers the move-list replay FEN and reports it via lastFenSource', () => {
    const doc = loadDom('game-white.html');
    const source = new LichessPositionSource(doc);
    const fen = source.getFen();
    expect(source.lastFenSource).toBe('replay');
    expect(fen.split(' ')[0]).toBe('rnbqkb1r/pp2pp1p/2pp2p1/8/2BP1n2/2N1PN2/PPP2PPP/R2QK2R');
  });

  it('falls back to the default Elo for a bot opponent with no displayed rating', () => {
    const doc = loadDom('game-white.html');
    const source = new LichessPositionSource(doc);
    expect(source.getEloOppo()).toBe(1500);
  });

  it('uses an explicit eloOppo override instead of the default', () => {
    const doc = loadDom('game-white.html');
    const source = new LichessPositionSource(doc, 1500, 1900);
    expect(source.getEloOppo()).toBe(1900);
  });
});

describe('arrowGenerator: geometry bit-matches a real captured chessground arrow', () => {
  it("e1->d2 green arrow matches the real sample's endpoint to full float precision", () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;
    const line = addArrow(board, 'e1', 'd2', '#15781B');
    expect(Number(line.getAttribute('x1'))).toBeCloseTo(0.5, 10);
    expect(Number(line.getAttribute('y1'))).toBeCloseTo(3.5, 10);
    expect(Number(line.getAttribute('x2'))).toBeCloseTo(-0.38951456543960195, 10);
    expect(Number(line.getAttribute('y2'))).toBeCloseTo(2.610485434560398, 10);
  });

  it("creates a self-owned overlay, never touching chessground's own svg.cg-shapes", () => {
    const doc = loadDom('game-white.html');
    const board = doc.querySelector('.cg-wrap')!;
    const nativeShapeCountBefore = board.querySelectorAll('svg.cg-shapes g[cgHash]').length;
    addArrow(board, 'e1', 'd2', '#9333EA');
    expect(board.querySelectorAll('svg.cg-shapes g[cgHash]')).toHaveLength(nativeShapeCountBefore);
    expect(board.querySelector('svg.maia2-overlay')).toBeTruthy();
  });
});
