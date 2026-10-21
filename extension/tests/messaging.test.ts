import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isEvaluateRequest,
  isEvaluateRequestInternal,
  requestMaiaEvaluation,
} from '@/messaging/maiaProtocol';

describe('message type guards', () => {
  it('isEvaluateRequest matches only the public message type', () => {
    expect(
      isEvaluateRequest({
        type: 'maia2-evaluate',
        fen: 'x',
        eloSelf: 1,
        eloOppo: 1,
        variant: 'rapid',
      }),
    ).toBe(true);
    expect(isEvaluateRequest({ type: 'maia2-evaluate-internal' })).toBe(false);
    expect(isEvaluateRequest({ type: 'something-else' })).toBe(false);
    expect(isEvaluateRequest(null)).toBe(false);
    expect(isEvaluateRequest('maia2-evaluate')).toBe(false);
  });

  it('isEvaluateRequestInternal matches only the internal relay message type', () => {
    expect(isEvaluateRequestInternal({ type: 'maia2-evaluate-internal' })).toBe(true);
    expect(isEvaluateRequestInternal({ type: 'maia2-evaluate' })).toBe(false);
  });
});

describe('requestMaiaEvaluation', () => {
  afterEach(() => {
    // @ts-expect-error
    delete globalThis.browser;
  });

  it('sends a maia2-evaluate message and returns the response as-is', async () => {
    const sendMessage = vi
      .fn()
      .mockResolvedValue({ ok: true, prediction: { moves: [], winProbWhite: 0.5 } });
    // @ts-expect-error
    globalThis.browser = { runtime: { sendMessage } };

    const response = await requestMaiaEvaluation({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      eloSelf: 1500,
      eloOppo: 1500,
      variant: 'rapid',
    });

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'maia2-evaluate',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      eloSelf: 1500,
      eloOppo: 1500,
      variant: 'rapid',
    });
    expect(response).toEqual({ ok: true, prediction: { moves: [], winProbWhite: 0.5 } });
  });

  it('reports a clean error instead of returning undefined when nothing responds', async () => {
    // @ts-expect-error
    globalThis.browser = { runtime: { sendMessage: vi.fn().mockResolvedValue(undefined) } };

    const response = await requestMaiaEvaluation({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      eloSelf: 1500,
      eloOppo: 1500,
      variant: 'rapid',
    });

    expect(response).toEqual({ ok: false, error: 'No response from background.' });
  });
});
