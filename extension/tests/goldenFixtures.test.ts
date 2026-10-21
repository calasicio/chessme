import { describe, expect, it } from 'vitest';
import { evaluatePosition } from '@/core/maiaSession';
import type { MaiaOrtSession } from '@/core/ortTypes';
import fixturesRapid from './fixtures/fixtures_rapid.json';
import fixturesBlitz from './fixtures/fixtures_blitz.json';
import { loadMaiaOrtSessionNode } from './ortNodeSession';

interface FixtureCase {
  label: string;
  fen: string;
  elo_self: number;
  elo_oppo: number;
  best_move: string;
  win_prob: number;
  move_probs: Record<string, number>;
}

const VARIANTS: { kind: 'rapid' | 'blitz'; cases: FixtureCase[] }[] = [
  { kind: 'rapid', cases: fixturesRapid.cases as unknown as FixtureCase[] },
  { kind: 'blitz', cases: fixturesBlitz.cases as unknown as FixtureCase[] },
];

describe.each(VARIANTS)('maia2-$kind golden fixtures', ({ kind, cases }) => {
  let session: MaiaOrtSession;

  it('loads the ONNX model', async () => {
    session = await loadMaiaOrtSessionNode(`public/models/maia2-${kind}.onnx`);
    expect(session).toBeDefined();
  });

  it.each(cases)('$label', async (testCase) => {
    const prediction = await evaluatePosition(
      session,
      testCase.fen,
      testCase.elo_self,
      testCase.elo_oppo,
    );

    expect(prediction.moves[0]?.uci).toBe(testCase.best_move);
    expect(prediction.winProbWhite).toBeCloseTo(testCase.win_prob, 3);

    for (const [uci, expectedProb] of Object.entries(testCase.move_probs)) {
      const actual = prediction.moves.find((m) => m.uci === uci);
      expect(actual, `expected move ${uci} to be legal`).toBeDefined();
      expect(actual!.probability).toBeCloseTo(expectedProb, 3);
    }
  });
});
