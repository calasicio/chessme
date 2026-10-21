import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { MaiaOrtSession } from '@/core/ortTypes';
import { parseBoard } from '@/positionSource/chesscom/boardParser';
import { ChesscomPositionSource } from '@/positionSource/chesscom/chesscomBoardReader';
import { readSan } from '@/positionSource/chesscom/moveListParser';
import {
  clearMaiaArrows,
  drawMaiaSuggestions,
  MAIA_ARROW_CLASS,
} from '@/positionSource/chesscom/maiaOverlay';
import { hasChesscomBoard, hasChesscomMoveList } from '@/positionSource/chesscom/presence';
import { runMaiaOnChesscom } from '@/positionSource/chesscom/runOnChesscom';
import { loadMaiaOrtSessionNode } from './ortNodeSession';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures/chesscom');

function loadDom(file: string): Document {
  const html = readFileSync(path.join(FIXTURES, file), 'utf-8');
  return new JSDOM(html).window.document;
}

describe('presence checks', () => {
  it('detects a board and move list when both exist', () => {
    const doc = loadDom('movelist-disambiguation.html');
    expect(hasChesscomBoard(doc)).toBe(true);
    expect(hasChesscomMoveList(doc)).toBe(true);
  });

  it('detects a board with no move list', () => {
    const doc = loadDom('board-with-arrows.html');
    expect(hasChesscomBoard(doc)).toBe(true);
    expect(hasChesscomMoveList(doc)).toBe(false);
  });

  it('detects neither on an unrelated page', () => {
    const doc = new JSDOM('<html><body><p>not chess.com</p></body></html>').window.document;
    expect(hasChesscomBoard(doc)).toBe(false);
    expect(hasChesscomMoveList(doc)).toBe(false);
  });
});

describe('ChesscomPositionSource', () => {
  it('prefers the move-list replay FEN when a move list exists', () => {
    const doc = loadDom('movelist-castling.html');
    const source = new ChesscomPositionSource(doc);
    const fen = source.getFen();
    expect(source.lastFenSource).toBe('replay');

    expect(fen.split(' ')[1]).toBe('w');
  });

  it('falls back to a board-only FEN (full castling rights assumed) when there is no move list', () => {
    const doc = loadDom('board-with-arrows.html');
    const source = new ChesscomPositionSource(doc);
    const fen = source.getFen();
    expect(source.lastFenSource).toBe('board-only');
    expect(fen.endsWith('w KQkq - 0 1')).toBe(true);
  });

  it('throws clearly when neither a board nor a move list exists', () => {
    const doc = new JSDOM('<html><body></body></html>').window.document;
    const source = new ChesscomPositionSource(doc);
    expect(() => source.getFen()).toThrow(/No <wc-chess-board>/);
  });

  it('scrapes the opponent rating shown in parens next to their name', () => {
    const doc = loadDom('board-with-arrows.html');
    const source = new ChesscomPositionSource(doc);
    expect(source.getEloOppo()).toBe(250);
  });

  it('uses an explicit eloOppo override instead of scraping when given one', () => {
    const doc = loadDom('board-with-arrows.html');
    const source = new ChesscomPositionSource(doc, 1500, 1800);
    expect(source.getEloOppo()).toBe(1800);
  });

  it('defaults eloSelf to 1500 and respects an explicit value', () => {
    const doc = loadDom('board-with-arrows.html');
    expect(new ChesscomPositionSource(doc).getEloSelf()).toBe(1500);
    expect(new ChesscomPositionSource(doc, 1200).getEloSelf()).toBe(1200);
  });
});

describe('maiaOverlay', () => {
  it('draws arrows for the top moves, tagged so only ours get cleared later', () => {
    const doc = loadDom('board-with-arrows.html');
    const board = doc.querySelector('wc-chess-board')!;
    const nativeArrowCountBefore = board.querySelectorAll('polygon.arrow').length;

    const prediction = {
      moves: [
        { uci: 'e2e4', probability: 0.5 },
        { uci: 'd2d4', probability: 0.3 },
        { uci: 'g1f3', probability: 0.2 },
      ],
      winProbWhite: 0.55,
    };
    const drawn = drawMaiaSuggestions(board, prediction, { topN: 3 });
    expect(drawn).toHaveLength(3);
    expect(board.querySelectorAll(`polygon.${MAIA_ARROW_CLASS}`)).toHaveLength(3);

    expect(board.querySelectorAll('polygon.arrow').length).toBe(nativeArrowCountBefore + 3);

    clearMaiaArrows(board);
    expect(board.querySelectorAll(`polygon.${MAIA_ARROW_CLASS}`)).toHaveLength(0);
    expect(board.querySelectorAll('polygon.arrow').length).toBe(nativeArrowCountBefore);
  });

  it('redrawing clears the previous set instead of accumulating', () => {
    const doc = loadDom('board-with-arrows.html');
    const board = doc.querySelector('wc-chess-board')!;
    drawMaiaSuggestions(board, { moves: [{ uci: 'e2e4', probability: 0.9 }], winProbWhite: 0.5 });
    drawMaiaSuggestions(board, { moves: [{ uci: 'd2d4', probability: 0.9 }], winProbWhite: 0.5 });
    expect(board.querySelectorAll(`polygon.${MAIA_ARROW_CLASS}`)).toHaveLength(1);
    expect(board.querySelector(`polygon.${MAIA_ARROW_CLASS}`)!.id).toBe('arrow-d2d4');
  });
});

describe('runMaiaOnChesscom end-to-end (real onnxruntime-node session)', () => {
  it('returns null when there is no board on the page', async () => {
    const doc = new JSDOM('<html><body></body></html>').window.document;
    const result = await runMaiaOnChesscom({} as MaiaOrtSession, doc);
    expect(result).toBeNull();
  });

  it('returns null instead of throwing when the replayed position is checkmate (no legal moves)', async () => {
    const session = await loadMaiaOrtSessionNode('public/models/maia2-rapid.onnx');

    const doc = loadDom('movelist-disambiguation.html');
    const result = await runMaiaOnChesscom(session, doc, { eloSelf: 1500, eloOppo: 1500 });
    expect(result).toBeNull();
  });

  it('reads a non-terminal position via move-list replay and draws real Maia arrows on the board', async () => {
    const session = await loadMaiaOrtSessionNode('public/models/maia2-rapid.onnx');
    const doc = loadDom('movelist-castling.html');

    doc.body.insertAdjacentHTML(
      'afterbegin',
      '<wc-chess-board id="board-play-computer"><svg class="arrows" viewBox="0 0 100 100"></svg></wc-chess-board>',
    );
    const board = doc.querySelector('wc-chess-board')!;

    const result = await runMaiaOnChesscom(session, doc, { eloSelf: 1500, eloOppo: 1500, topN: 3 });

    expect(result).not.toBeNull();
    expect(result!.fenSource).toBe('replay');
    expect(result!.prediction.moves.length).toBeGreaterThan(0);
    expect(result!.prediction.winProbWhite).toBeGreaterThanOrEqual(0);
    expect(result!.prediction.winProbWhite).toBeLessThanOrEqual(1);

    const drawnCount = Math.min(3, result!.prediction.moves.length);
    expect(board.querySelectorAll(`polygon.${MAIA_ARROW_CLASS}`)).toHaveLength(drawnCount);
  });
});

describe('boardParser on a flipped board (black at bottom)', () => {
  it('reads piece placement correctly regardless of the "flipped" class', () => {
    const doc = loadDom('board-flipped.html');
    const board = doc.querySelector('wc-chess-board')!;
    expect(board.classList.contains('flipped')).toBe(true);

    const { placement } = parseBoard(board);

    expect(placement).toBe('Q7/2p1K3/kp6/p3p3/4P3/2PP4/P1P5/1R6');
  });
});

describe('readSan: disambiguated rook move', () => {
  it('keeps the file disambiguator from a figurine + plain text pair (Rdd6)', () => {
    const doc = new JSDOM(
      '<span class="node-highlight-content"><span class="icon-font-chess rook-black " data-figurine="R"></span> dd6 </span>',
    ).window.document;
    const content = doc.querySelector('.node-highlight-content')!;
    expect(readSan(content)).toBe('Rdd6');
  });
});
