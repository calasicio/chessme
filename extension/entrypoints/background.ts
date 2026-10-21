import { handleEvaluateRequest } from '@/runtime/maiaInferenceHost';
import {
  isEvaluateRequest,
  type EvaluateRequestInternal,
  type EvaluateResponse,
} from '@/messaging/maiaProtocol';

const OFFSCREEN_URL = 'offscreen.html';

const hasOffscreen = typeof browser.offscreen !== 'undefined';

let ensureOffscreenPromise: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  if (!ensureOffscreenPromise) {
    ensureOffscreenPromise = browser.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ['WORKERS'],
        justification: 'Runs the Maia2 chess model (ONNX Runtime Web/WASM) off the main thread.',
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.includes('single offscreen document')) {
          return;
        }
        ensureOffscreenPromise = null;
        throw error;
      });
  }
  return ensureOffscreenPromise;
}

async function relayToOffscreen(request: EvaluateRequestInternal): Promise<EvaluateResponse> {
  await ensureOffscreenDocument();
  const response = (await browser.runtime.sendMessage(request)) as EvaluateResponse | undefined;
  if (response) return response;

  await new Promise((resolve) => setTimeout(resolve, 150));
  const retried = (await browser.runtime.sendMessage(request)) as EvaluateResponse | undefined;
  return retried ?? { ok: false, error: 'Offscreen document did not respond.' };
}

export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    browser.tabs.create({ url: browser.runtime.getURL('/playground.html') });
  });

  browser.runtime.onMessage.addListener((message) => {
    if (!isEvaluateRequest(message)) return undefined;
    const { fen, eloSelf, eloOppo, variant } = message;

    if (hasOffscreen) {
      return relayToOffscreen({ type: 'maia2-evaluate-internal', fen, eloSelf, eloOppo, variant });
    }
    return handleEvaluateRequest({ fen, eloSelf, eloOppo, variant });
  });
});
