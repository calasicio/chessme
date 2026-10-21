import * as ort from 'onnxruntime-node';
import type { MaiaOrtSession, MaiaTensor } from '@/core/ortTypes';

class OrtNodeSession implements MaiaOrtSession {
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
      const data = tensor.data;
      if (!(data instanceof Float32Array) && !(data instanceof BigInt64Array)) {
        throw new Error(`Unexpected ONNX tensor data type for "${name}"`);
      }
      outputs[name] = { data, dims: tensor.dims as number[] };
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

export async function loadMaiaOrtSessionNode(modelPath: string): Promise<MaiaOrtSession> {
  const session = await ort.InferenceSession.create(modelPath);
  return new OrtNodeSession(session);
}
