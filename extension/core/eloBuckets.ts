const START = 1100;
const END = 2000;
const INTERVAL = 100;

export const ELO_BUCKET_COUNT = 11;

export function mapToEloCategory(elo: number): number {
  if (elo < START) return 0;
  if (elo >= END) return ELO_BUCKET_COUNT - 1;

  const bucketIndex = Math.floor((elo - START) / INTERVAL);
  return 1 + bucketIndex;
}

export interface EloBucketOption {
  label: string;

  value: number;
}

export const ELO_BUCKET_OPTIONS: EloBucketOption[] = [
  { label: '<1100', value: 1000 },
  ...Array.from({ length: 9 }, (_, i) => {
    const lower = START + i * INTERVAL;
    return { label: `${lower}-${lower + INTERVAL - 1}`, value: lower + INTERVAL / 2 };
  }),
  { label: `>=${END}`, value: END + 200 },
];

export function findEloBucketOption(elo: number): EloBucketOption {
  const category = mapToEloCategory(elo);
  return ELO_BUCKET_OPTIONS[category]!;
}
