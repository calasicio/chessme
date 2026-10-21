import type { PositionSource } from './PositionSource';

export class ManualInputPositionSource implements PositionSource {
  constructor(
    private readonly fenInput: HTMLInputElement,
    private readonly eloSelfInput: HTMLInputElement,
    private readonly eloOppoInput: HTMLInputElement,
  ) {}

  getFen(): string {
    return this.fenInput.value.trim();
  }

  getEloSelf(): number {
    return Number(this.eloSelfInput.value);
  }

  getEloOppo(): number {
    return Number(this.eloOppoInput.value);
  }
}
