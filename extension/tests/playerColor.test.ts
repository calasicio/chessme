import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { detectPlayerColor } from '@/positionSource/chesscom/playerColor';

const FIXTURES = path.resolve(import.meta.dirname, 'fixtures/chesscom');

function loadBoard(file: string): Element {
  const html = readFileSync(path.join(FIXTURES, file), 'utf-8');
  return new JSDOM(html).window.document.querySelector('wc-chess-board')!;
}

describe('detectPlayerColor', () => {
  it('reports White when the board has no "flipped" class', () => {
    expect(detectPlayerColor(loadBoard('board-with-arrows.html'))).toBe('w');
  });

  it('reports Black when the board has the "flipped" class (confirmed real sample)', () => {
    expect(detectPlayerColor(loadBoard('board-flipped.html'))).toBe('b');
  });
});
