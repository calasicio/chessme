export interface MaiaTensor {
  readonly data: Float32Array | BigInt64Array;
  readonly dims: readonly number[];
}

export interface MaiaOrtSession {
  run(feeds: Record<string, MaiaTensor>): Promise<Record<string, MaiaTensor>>;
  createTensor(
    type: 'float32' | 'int64',
    data: Float32Array | BigInt64Array,
    dims: number[],
  ): MaiaTensor;
}
