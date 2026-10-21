import { boardToTensor } from './boardTensor';
import { mapToEloCategory } from './eloBuckets';
import { mirrorMoveUci, toWhitePerspectiveFen } from './fenMirror';
import { indexToMoveUci, legalMoveIndices } from './moveVocab';
import type { MaiaOrtSession } from './ortTypes';

export interface MovePrediction {
  uci: string;
  probability: number;
}

export interface MaiaPrediction {
  moves: MovePrediction[];

  winProbWhite: number;
}

function at(array: Float32Array, index: number): number {
  const value = array[index];
  if (value === undefined) {
    throw new Error(`Index ${index} is out of bounds (length ${array.length})`);
  }
  return value;
}

function getOutput(
  outputs: Record<string, { data: Float32Array | BigInt64Array }>,
  name: string,
): Float32Array {
  const tensor = outputs[name];
  if (!tensor) {
    throw new Error(`Model output "${name}" is missing; got [${Object.keys(outputs)}]`);
  }
  return tensor.data as Float32Array;
}

function maskedSoftmax(logits: Float32Array, legalIndices: readonly number[]): Float32Array {
  const probs = new Float32Array(logits.length);
  let max = -Infinity;
  for (const i of legalIndices) max = Math.max(max, at(logits, i));

  let sum = 0;
  for (const i of legalIndices) {
    const exp = Math.exp(at(logits, i) - max);
    probs[i] = exp;
    sum += exp;
  }
  for (const i of legalIndices) probs[i] = at(probs, i) / sum;
  return probs;
}

export async function evaluatePosition(
  session: MaiaOrtSession,
  fen: string,
  eloSelf: number,
  eloOppo: number,
): Promise<MaiaPrediction> {
  const { fen: modelFen, wasMirrored } = toWhitePerspectiveFen(fen);

  const boardTensorData = boardToTensor(modelFen);
  const legalIndices = legalMoveIndices(modelFen);
  const eloSelfIdx = mapToEloCategory(eloSelf);
  const eloOppoIdx = mapToEloCategory(eloOppo);

  const feeds = {
    boards: session.createTensor('float32', boardTensorData, [1, 18, 8, 8]),
    elo_self: session.createTensor('int64', BigInt64Array.from([BigInt(eloSelfIdx)]), [1]),
    elo_oppo: session.createTensor('int64', BigInt64Array.from([BigInt(eloOppoIdx)]), [1]),
  };

  const outputs = await session.run(feeds);
  const logitsMaia = getOutput(outputs, 'logits_maia');
  const rawValue = at(getOutput(outputs, 'logits_value'), 0);

  const probs = maskedSoftmax(logitsMaia, legalIndices);

  let winProbWhite = Math.min(1, Math.max(0, rawValue / 2 + 0.5));
  if (wasMirrored) winProbWhite = 1 - winProbWhite;

  const moves: MovePrediction[] = legalIndices.map((index) => {
    const mirroredUci = indexToMoveUci(index);
    const uci = wasMirrored ? mirrorMoveUci(mirroredUci) : mirroredUci;
    return { uci, probability: at(probs, index) };
  });
  moves.sort((a, b) => b.probability - a.probability);

  return { moves, winProbWhite };
}
