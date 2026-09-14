/**
 * Single source of truth for ranking v0.2 constants.
 *
 * These MUST match public.recompute_rankings() / public.set_allocation()
 * in supabase/migrations/20260914000001_layer1_allocation_ranking.sql:
 *
 *   visible  = approved AND allocation_cents >= 1000
 *   rank     = ROW_NUMBER() OVER (
 *                ORDER BY allocation_cents DESC, allocation_set_at ASC, listing_id
 *              )
 *   increment = 100 cents
 *   #1 take   = current #1 allocation + 500 cents
 *
 * Retired organic weights below are NOT used in rank calculation. They stay
 * on this object so existing Lovable screens that still read them compile.
 */
export const RANKING = {
  version: "v0.2",
  incrementCents: 100,
  minVisibleCents: 1000,
  numberOnePremiumCents: 500,
  /** Retired. Views do not affect rank. Kept for existing route compile. */
  viewWeight: 3,
  /** Retired. Shares do not affect rank. Kept for existing route compile. */
  shareWeight: 5,
  /** Retired. Freshness does not affect rank. Kept for existing route compile. */
  freshnessWeight: 1.5,
  /** Retired. Kept for existing route compile. */
  freshnessWindowDays: 30,
} as const;

export const BOARDS = ["all_time", "today", "daily"] as const;
export type BoardKind = (typeof BOARDS)[number];

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

export function isBoardVisible(allocationCents: number): boolean {
  return allocationCents >= RANKING.minVisibleCents;
}

export function utcDateString(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export type AllocationAmountResult = { ok: true } | { ok: false; reason: string };

/** 0 leaves the board. Any other amount must be >= $10 and a $1 increment. */
export function assertAllocationAmount(newCents: number): AllocationAmountResult {
  if (!Number.isInteger(newCents) || newCents < 0) {
    return { ok: false, reason: "Allocation must be a non-negative integer number of cents." };
  }
  if (newCents === 0) return { ok: true };
  if (newCents < RANKING.minVisibleCents) {
    return { ok: false, reason: `Minimum allocation is ${RANKING.minVisibleCents} cents.` };
  }
  if (newCents % RANKING.incrementCents !== 0) {
    return {
      ok: false,
      reason: `Allocation must be in ${RANKING.incrementCents}-cent increments.`,
    };
  }
  return { ok: true };
}

/** Becoming #1 requires strictly more than the current #1 (ties lose on later time). */
export function wouldTakeFirst(
  newCents: number,
  currentFirstCents: number | null,
  isAlreadyFirst: boolean,
): boolean {
  if (isAlreadyFirst) return false;
  if (!isBoardVisible(newCents)) return false;
  if (currentFirstCents == null) return true;
  return newCents > currentFirstCents;
}

export function meetsNumberOnePremium(
  newCents: number,
  currentFirstCents: number | null,
  isAlreadyFirst: boolean,
): boolean {
  if (!wouldTakeFirst(newCents, currentFirstCents, isAlreadyFirst)) return true;
  if (currentFirstCents == null) return true;
  return newCents >= currentFirstCents + RANKING.numberOnePremiumCents;
}

/** Cents needed for a non-#1 listing to claim #1. 0 if already first. */
export function costToClaimFirstCents(
  currentFirstAllocationCents: number | null,
  isAlreadyFirst: boolean,
): number {
  if (isAlreadyFirst) return 0;
  if (
    currentFirstAllocationCents == null ||
    currentFirstAllocationCents < RANKING.minVisibleCents
  ) {
    return RANKING.minVisibleCents;
  }
  return currentFirstAllocationCents + RANKING.numberOnePremiumCents;
}

/** Cents needed to overtake the listing immediately above. 0 if nobody is above. */
export function costToOvertakeCents(
  myCents: number,
  aboveCents: number | null,
  aboveIsFirst: boolean,
): number {
  if (aboveCents == null) return 0;
  const step = aboveIsFirst ? RANKING.numberOnePremiumCents : RANKING.incrementCents;
  return Math.max(0, aboveCents + step - myCents);
}

export type Rankable = {
  id: string;
  allocationCents: number;
  allocationSetAt: string;
};

export function compareAllocationRank(a: Rankable, b: Rankable): number {
  if (b.allocationCents !== a.allocationCents) return b.allocationCents - a.allocationCents;
  if (a.allocationSetAt !== b.allocationSetAt)
    return a.allocationSetAt < b.allocationSetAt ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

export function rankVisible<T extends Rankable>(listings: T[]): (T & { rank: number })[] {
  return listings
    .filter((row) => isBoardVisible(row.allocationCents))
    .slice()
    .sort(compareAllocationRank)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/** 1 point converts to 1 cent. */
export const POINTS = {
  centsPerPoint: 1,
} as const;

export function pointsForCents(cents: number): number {
  return Math.ceil(cents / POINTS.centsPerPoint);
}

export function centsForPoints(points: number): number {
  return points * POINTS.centsPerPoint;
}

/**
 * Rank a new allocation would take on this board. Ties lose to listings already
 * there. Passing the leader without the $5 #1 premium previews as #2.
 */
export function previewRankForAmount(
  peers: Array<{ allocationCents: number }>,
  newCents: number,
): number | null {
  if (!isBoardVisible(newCents)) return null;

  const visible = peers.filter((peer) => isBoardVisible(peer.allocationCents));
  const firstCents =
    visible.length === 0 ? null : Math.max(...visible.map((peer) => peer.allocationCents));
  const above = visible.filter((peer) => peer.allocationCents > newCents).length;
  const ties = visible.filter((peer) => peer.allocationCents === newCents).length;
  let rank = above + ties + 1;

  if (
    firstCents != null &&
    newCents > firstCents &&
    newCents < firstCents + RANKING.numberOnePremiumCents
  ) {
    rank = Math.max(rank, 2);
  }

  return rank;
}
