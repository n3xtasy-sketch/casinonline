/** A compact ranked row (name + 0–5 rating) used by sidebar ranked widgets. */
export interface RankedRow {
  name: string;
  rating: number;
}

/** A game pick for the sidebar list (no rating — games have no rating in DB). */
export interface GamePick {
  name: string;
  provider: string;
}
