import { evaluatePosition } from '@/core/maiaSession';
import type { MaiaOrtSession } from '@/core/ortTypes';
import type { EvaluateRequest, EvaluateResponse, MaiaVariant } from '@/messaging/maiaProtocol';
import { loadMaiaOrtSession } from './ortWebSession';

const sessions = new Map<MaiaVariant, Promise<MaiaOrtSession>>();

function getSession(variant: MaiaVariant): Promise<MaiaOrtSession> {
  let session = sessions.get(variant);
  if (!session) {
    session = loadMaiaOrtSession(browser.runtime.getURL(`/models/maia2-${variant}.onnx`));
    sessions.set(variant, session);
  }
  return session;
}

export async function handleEvaluateRequest(
  request: Pick<EvaluateRequest, 'fen' | 'eloSelf' | 'eloOppo' | 'variant'>,
): Promise<EvaluateResponse> {
  try {
    const session = await getSession(request.variant);
    const prediction = await evaluatePosition(
      session,
      request.fen,
      request.eloSelf,
      request.eloOppo,
    );
    return { ok: true, prediction };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
