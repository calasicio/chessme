export interface PositionSource {
  getFen(): string;
  getEloSelf(): number;
  getEloOppo(): number;
}

export type FenSource = 'replay' | 'board-only';
