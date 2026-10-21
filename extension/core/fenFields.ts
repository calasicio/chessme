export interface FenFields {
  placement: string;
  turn: string;
  castling: string;
  ep: string;
  halfmove: string;
  fullmove: string;
}

export function splitFen(fen: string): FenFields {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) {
    throw new Error(`Expected a 6-field FEN, got ${fields.length} fields: ${fen}`);
  }
  const [placement, turn, castling, ep, halfmove, fullmove] = fields as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  return { placement, turn, castling, ep, halfmove, fullmove };
}
