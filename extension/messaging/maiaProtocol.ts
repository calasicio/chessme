import type { MaiaPrediction } from '@/core/maiaSession';

export type MaiaVariant = 'rapid' | 'blitz';

export interface EvaluateRequest {
  type: 'maia2-evaluate';
  fen: string;
  eloSelf: number;
  eloOppo: number;
  variant: MaiaVariant;
}

export interface EvaluateRequestInternal extends Omit<EvaluateRequest, 'type'> {
  type: 'maia2-evaluate-internal';
}

export type EvaluateResponse =
  { ok: true; prediction: MaiaPrediction } | { ok: false; error: string };

export function isEvaluateRequest(message: unknown): message is EvaluateRequest {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'maia2-evaluate'
  );
}

export function isEvaluateRequestInternal(message: unknown): message is EvaluateRequestInternal {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'maia2-evaluate-internal'
  );
}

export async function requestMaiaEvaluation(
  request: Omit<EvaluateRequest, 'type'>,
): Promise<EvaluateResponse> {
  const response = (await browser.runtime.sendMessage({
    type: 'maia2-evaluate',
    ...request,
  })) as EvaluateResponse | undefined;
  return response ?? { ok: false, error: 'No response from background.' };
}
