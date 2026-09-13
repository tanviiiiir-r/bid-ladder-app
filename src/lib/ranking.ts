/**
 * Single source of truth for the documented ranking v0.1 constants.
 *
 * These MUST match public.recompute_rankings() in the database:
 *   freshness_days = max(0, 30 - days_since(approved_at || created_at))
 *   score = unique_views * 3.0 + shares * 5.0 + freshness_days * 1.5
 *   rank  = ROW_NUMBER() OVER (ORDER BY score DESC, listing_id)
 *
 * If the SQL weights change, update these constants in the same change so the
 * public "How ranking works" page never lies.
 */
export const RANKING = {
  version: "v0.1",
  viewWeight: 3,
  shareWeight: 5,
  freshnessWeight: 1.5,
  freshnessWindowDays: 30,
} as const;

/** Movement hysteresis: sparse early traffic must not produce ±1 thrash. */
export const MOVEMENT = {
  /** Minimum |delta| to show a number outside the top N. */
  minDelta: 2,
  /** Inside the top N, a single-position move is meaningful. */
  topN: 10,
} as const;

export type Movement =
  | { kind: "none" }
  | { kind: "new" }
  | { kind: "flat" }
  | { kind: "up"; delta: number; rising: boolean }
  | { kind: "down"; delta: number };

/** Derives movement from real persisted ranks only. No synthetic velocity. */
export function getMovement(rank: number | null, previousRank: number | null): Movement {
  if (rank == null) return { kind: "none" };
  if (previousRank == null) return { kind: "new" };

  const delta = previousRank - rank;
  const magnitude = Math.abs(delta);
  if (magnitude === 0) return { kind: "flat" };

  const inTopN = rank <= MOVEMENT.topN;
  const significant = magnitude >= MOVEMENT.minDelta || inTopN;
  if (!significant) return { kind: "flat" };

  return delta > 0
    ? { kind: "up", delta: magnitude, rising: magnitude >= MOVEMENT.minDelta || inTopN }
    : { kind: "down", delta: magnitude };
}
