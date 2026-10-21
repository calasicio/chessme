import { handleEvaluateRequest } from '@/runtime/maiaInferenceHost';
import { isEvaluateRequestInternal } from '@/messaging/maiaProtocol';

browser.runtime.onMessage.addListener((message) => {
  if (!isEvaluateRequestInternal(message)) return undefined;
  return handleEvaluateRequest(message);
});
