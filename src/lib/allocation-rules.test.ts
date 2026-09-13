import { describe, expect, test } from "bun:test";

import {
  RANKING,
  assertAllocationAmount,
  isBoardVisible,
  meetsNumberOnePremium,
  rankVisible,
  utcDateString,
} from "./ranking";

type Listing = {
  id: string;
  ownerId: string;
  status: "approved" | "pending" | "rejected";
  allocationCents: number;
  allocationSetAt: string | null;
};

type DailyRow = {
  listingId: string;
  utcDate: string;
  amountCents: number;
  firstAllocatedAt: string;
};

type Snapshot = {
  utcDate: string;
  listingId: string;
  rank: number;
  allocationCents: number;
};

type LedgerRow = {
  userId: string;
  amountCents: number;
  type: "admin_grant" | "allocation" | "allocation_release";
  idempotencyKey?: string;
};

class Economy {
  clock = new Date("2026-09-14T12:00:00.000Z");
  listings = new Map<string, Listing>();
  wallets = new Map<string, number>();
  daily: DailyRow[] = [];
  snapshots: Snapshot[] = [];
  ledger: LedgerRow[] = [];

  today() {
    return utcDateString(this.clock);
  }

  grant(userId: string, cents: number, idempotencyKey?: string) {
    if (idempotencyKey && this.ledger.some((row) => row.idempotencyKey === idempotencyKey)) {
      return { ok: true as const, idempotent: true };
    }
    this.wallets.set(userId, (this.wallets.get(userId) ?? 0) + cents);
    this.ledger.push({
      userId,
      amountCents: cents,
      type: "admin_grant",
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    return { ok: true as const, idempotent: false };
  }

  setAllocation(listingId: string, newCents: number) {
    const amount = assertAllocationAmount(newCents);
    if (!amount.ok) return amount;

    const listing = this.listings.get(listingId);
    if (!listing) return { ok: false as const, reason: "listing not found" };

    const delta = newCents - listing.allocationCents;
    if (delta === 0) return { ok: true as const, noop: true };

    const available = this.wallets.get(listing.ownerId) ?? 0;
    if (delta > 0 && available < delta) {
      return { ok: false as const, reason: "insufficient credits" };
    }

    const allTimeFirst = this.allTimeBoard()[0];
    if (
      delta > 0 &&
      !meetsNumberOnePremium(
        newCents,
        allTimeFirst?.allocationCents ?? null,
        allTimeFirst?.id === listingId,
      )
    ) {
      return {
        ok: false as const,
        reason: "taking all-time #1 requires current #1 plus 500 cents",
      };
    }

    const todayAmount =
      this.daily.find((row) => row.listingId === listingId && row.utcDate === this.today())
        ?.amountCents ?? 0;
    const todayNew = Math.max(0, todayAmount + delta);
    const todayFirst = this.todayBoard()[0];
    if (
      delta > 0 &&
      !meetsNumberOnePremium(
        todayNew,
        todayFirst?.allocationCents ?? null,
        todayFirst?.id === listingId,
      )
    ) {
      return { ok: false as const, reason: "taking today #1 requires current #1 plus 500 cents" };
    }

    this.wallets.set(listing.ownerId, available - delta);
    listing.allocationCents = newCents;
    listing.allocationSetAt = this.clock.toISOString();
    this.upsertToday(listingId, todayNew);
    this.ledger.push({
      userId: listing.ownerId,
      amountCents: -delta,
      type: delta > 0 ? "allocation" : "allocation_release",
    });
    return { ok: true as const, allocationCents: newCents, todayCents: todayNew };
  }

  upsertToday(listingId: string, amountCents: number) {
    const utcDate = this.today();
    const existing = this.daily.find(
      (row) => row.listingId === listingId && row.utcDate === utcDate,
    );
    if (amountCents === 0) {
      this.daily = this.daily.filter((row) => row !== existing);
      return;
    }
    if (existing) {
      existing.amountCents = amountCents;
      existing.firstAllocatedAt = this.clock.toISOString();
      return;
    }
    this.daily.push({
      listingId,
      utcDate,
      amountCents,
      firstAllocatedAt: this.clock.toISOString(),
    });
  }

  allTimeBoard() {
    return rankVisible(
      [...this.listings.values()]
        .filter((listing) => listing.status === "approved")
        .map((listing) => ({
          id: listing.id,
          allocationCents: listing.allocationCents,
          allocationSetAt: listing.allocationSetAt ?? "",
        })),
    );
  }

  todayBoard(date = this.today()) {
    return rankVisible(
      this.daily
        .filter((row) => row.utcDate === date)
        .filter((row) => this.listings.get(row.listingId)?.status === "approved")
        .map((row) => ({
          id: row.listingId,
          allocationCents: row.amountCents,
          allocationSetAt: row.firstAllocatedAt,
        })),
    );
  }

  freeze(date = utcDateString(new Date(this.clock.getTime() - 86_400_000))) {
    if (this.snapshots.some((row) => row.utcDate === date)) return;
    for (const row of this.todayBoard(date)) {
      this.snapshots.push({
        utcDate: date,
        listingId: row.id,
        rank: row.rank,
        allocationCents: row.allocationCents,
      });
    }
  }
}

function seed() {
  const eco = new Economy();
  eco.listings.set("alpha", {
    id: "alpha",
    ownerId: "owner-a",
    status: "approved",
    allocationCents: 0,
    allocationSetAt: null,
  });
  eco.listings.set("beta", {
    id: "beta",
    ownerId: "owner-b",
    status: "approved",
    allocationCents: 0,
    allocationSetAt: null,
  });
  eco.listings.set("pending", {
    id: "pending",
    ownerId: "owner-a",
    status: "pending",
    allocationCents: 0,
    allocationSetAt: null,
  });
  return eco;
}

describe("allocation economy (mirrors SQL RPCs)", () => {
  test("hides $0 approved listings from the public board", () => {
    const eco = seed();
    eco.grant("owner-a", 5000);
    expect(eco.allTimeBoard()).toEqual([]);
    expect(eco.setAllocation("alpha", 1000).ok).toBe(true);
    expect(eco.allTimeBoard().map((row) => row.id)).toEqual(["alpha"]);
  });

  test("increase consumes the delta; decrease releases it", () => {
    const eco = seed();
    eco.grant("owner-a", 5000);
    eco.setAllocation("alpha", 2000);
    expect(eco.wallets.get("owner-a")).toBe(3000);
    eco.setAllocation("alpha", 1000);
    expect(eco.wallets.get("owner-a")).toBe(4000);
    expect(eco.listings.get("alpha")?.allocationCents).toBe(1000);
    expect(eco.ledger.filter((row) => row.type === "allocation_release")).toHaveLength(1);
  });

  test("insufficient credits fail without mutating allocation", () => {
    const eco = seed();
    eco.grant("owner-a", 1000);
    const result = eco.setAllocation("alpha", 2000);
    expect(result.ok).toBe(false);
    expect(eco.listings.get("alpha")?.allocationCents).toBe(0);
    expect(eco.allTimeBoard()).toEqual([]);
  });

  test("taking #1 requires +$5; +$1 is not enough", () => {
    const eco = seed();
    eco.grant("owner-a", 20_000);
    eco.grant("owner-b", 20_000);
    eco.setAllocation("alpha", 17000);
    expect(eco.setAllocation("beta", 17100).ok).toBe(false);
    expect(eco.setAllocation("beta", 17500).ok).toBe(true);
    expect(eco.allTimeBoard()[0]?.id).toBe("beta");
  });

  test("equal allocations: earlier timestamp keeps the higher rank", () => {
    const eco = seed();
    eco.grant("owner-a", 5000);
    eco.grant("owner-b", 5000);
    eco.setAllocation("alpha", 2000);
    eco.clock = new Date("2026-09-14T13:00:00.000Z");
    eco.setAllocation("beta", 2000);
    const board = eco.allTimeBoard();
    expect(board[0]?.id).toBe("alpha");
    expect(board[1]?.id).toBe("beta");
  });

  test("Today is isolated from All-time", () => {
    const eco = seed();
    eco.grant("owner-a", 20_000);
    eco.grant("owner-b", 20_000);
    eco.setAllocation("alpha", 10000);
    eco.clock = new Date("2026-09-15T12:00:00.000Z");
    eco.setAllocation("beta", 1000);
    expect(eco.allTimeBoard()[0]?.id).toBe("alpha");
    expect(eco.todayBoard()[0]?.id).toBe("beta");
    expect(eco.todayBoard().map((row) => row.id)).toEqual(["beta"]);
  });

  test("midnight freeze snapshots yesterday and does not overwrite", () => {
    const eco = seed();
    eco.grant("owner-a", 5000);
    eco.setAllocation("alpha", 1000);
    eco.clock = new Date("2026-09-15T00:00:00.000Z");
    eco.freeze("2026-09-14");
    eco.freeze("2026-09-14");
    expect(eco.snapshots).toEqual([
      { utcDate: "2026-09-14", listingId: "alpha", rank: 1, allocationCents: 1000 },
    ]);
    expect(eco.todayBoard("2026-09-15")).toEqual([]);
  });

  test("duplicate admin grant with the same idempotency key is a no-op", () => {
    const eco = seed();
    eco.grant("owner-a", 1000, "grant-1");
    eco.grant("owner-a", 1000, "grant-1");
    expect(eco.wallets.get("owner-a")).toBe(1000);
    expect(eco.ledger.filter((row) => row.type === "admin_grant")).toHaveLength(1);
  });

  test("pending listings never appear even with allocation", () => {
    const eco = seed();
    eco.grant("owner-a", 5000);
    eco.setAllocation("pending", 2000);
    expect(eco.allTimeBoard().some((row) => row.id === "pending")).toBe(false);
    expect(isBoardVisible(2000)).toBe(true);
  });

  test("funded = available + committed", () => {
    const eco = seed();
    eco.grant("owner-a", 5000);
    eco.setAllocation("alpha", 2000);
    const available = eco.wallets.get("owner-a") ?? 0;
    const committed = [...eco.listings.values()]
      .filter((listing) => listing.ownerId === "owner-a")
      .reduce((sum, listing) => sum + listing.allocationCents, 0);
    expect(available + committed).toBe(5000);
    expect(RANKING.minVisibleCents).toBeLessThanOrEqual(committed);
  });
});
