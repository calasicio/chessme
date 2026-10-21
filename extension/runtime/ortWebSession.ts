import * as ort from 'onnxruntime-web/wasm';
import type { MaiaOrtSession, MaiaTensor } from '@/core/ortTypes';

let configured = false;

function configureOrtOnce() {
  if (configured) return;
  ort.env.wasm.wasmPaths = {
    wasm: browser.runtime.getURL('/ort/ort-wasm-simd-threaded.wasm'),
    mjs: browser.runtime.getURL('/ort/ort-wasm-simd-threaded.mjs'),
  };
  ort.env.wasm.numThreads = 1;
  configured = true;
}

function toMaiaTensor(tensor: ort.Tensor): MaiaTensor {
  const { data, dims } = tensor;
  if (!(data instanceof Float32Array) && !(data instanceof BigInt64Array)) {
    throw new Error(`Unexpected ONNX tensor data type for "${tensor.type}"`);
  }
  return { data, dims };
}

class OrtWebSession implements MaiaOrtSession {
  constructor(private readonly session: ort.InferenceSession) {}

  async run(feeds: Record<string, MaiaTensor>): Promise<Record<string, MaiaTensor>> {
    const ortFeeds: Record<string, ort.Tensor> = {};
    for (const [name, tensor] of Object.entries(feeds)) {
      ortFeeds[name] = new ort.Tensor(
        tensor.data instanceof BigInt64Array ? 'int64' : 'float32',
        tensor.data,
        tensor.dims as number[],
      );
    }
    const results = await this.session.run(ortFeeds);
    const outputs: Record<string, MaiaTensor> = {};
    for (const [name, tensor] of Object.entries(results)) {
      outputs[name] = toMaiaTensor(tensor);
    }
    return outputs;
  }

  createTensor(
    type: 'float32' | 'int64',
    data: Float32Array | BigInt64Array,
    dims: number[],
  ): MaiaTensor {
    return { data, dims };
  }
}

export async function loadMaiaOrtSession(modelUrl: string): Promise<MaiaOrtSession> {
  configureOrtOnce();
  const session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['wasm'],
  });
  return new OrtWebSession(session);
}
