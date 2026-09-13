import { describe, expect, test } from "bun:test";

import {
  RANKING,
  assertAllocationAmount,
  compareAllocationRank,
  costToClaimFirstCents,
  costToOvertakeCents,
  isBoardVisible,
  meetsNumberOnePremium,
  rankVisible,
  utcDateString,
  wouldTakeFirst,
} from "./ranking";

describe("RANKING v0.2 constants", () => {
  test("match the SQL contract", () => {
    expect(RANKING.version).toBe("v0.2");
    expect(RANKING.incrementCents).toBe(100);
    expect(RANKING.minVisibleCents).toBe(1000);
    expect(RANKING.numberOnePremiumCents).toBe(500);
  });
});

describe("assertAllocationAmount", () => {
  test("allows leaving the board at 0", () => {
    expect(assertAllocationAmount(0)).toEqual({ ok: true });
  });

  test("rejects amounts below $10", () => {
    expect(assertAllocationAmount(900).ok).toBe(false);
  });

  test("rejects non-increment amounts", () => {
    expect(assertAllocationAmount(1050).ok).toBe(false);
  });

  test("accepts $10 and $1 steps above it", () => {
    expect(assertAllocationAmount(1000)).toEqual({ ok: true });
    expect(assertAllocationAmount(1100)).toEqual({ ok: true });
  });
});

describe("visibility", () => {
  test("hides $0 and sub-minimum allocations", () => {
    expect(isBoardVisible(0)).toBe(false);
    expect(isBoardVisible(900)).toBe(false);
    expect(isBoardVisible(1000)).toBe(true);
  });
});

describe("#1 premium", () => {
  test("empty board: first visible listing becomes #1 without a premium", () => {
    expect(wouldTakeFirst(1000, null, false)).toBe(true);
    expect(meetsNumberOnePremium(1000, null, false)).toBe(true);
  });

  test("taking #1 requires current #1 + $5", () => {
    expect(wouldTakeFirst(17000, 17000, false)).toBe(false);
    expect(wouldTakeFirst(17001, 17000, false)).toBe(true);
    expect(meetsNumberOnePremium(17100, 17000, false)).toBe(false);
    expect(meetsNumberOnePremium(17500, 17000, false)).toBe(true);
  });

  test("raising your own #1 does not require the premium", () => {
    expect(wouldTakeFirst(17600, 17500, true)).toBe(false);
    expect(meetsNumberOnePremium(17600, 17500, true)).toBe(true);
  });
});

describe("overtake math", () => {
  test("claim #1 is current first + premium", () => {
    expect(costToClaimFirstCents(17000, false)).toBe(17500);
    expect(costToClaimFirstCents(17000, true)).toBe(0);
    expect(costToClaimFirstCents(null, false)).toBe(1000);
  });

  test("overtaking a non-first listing is +$1", () => {
    expect(costToOvertakeCents(8300, 9000, false)).toBe(800);
  });

  test("overtaking #1 is +$5", () => {
    expect(costToOvertakeCents(8300, 9000, true)).toBe(1200);
  });
});

describe("tie-break", () => {
  test("equal allocation: earlier timestamp wins, then listing id", () => {
    const older = { id: "b", allocationCents: 2000, allocationSetAt: "2026-09-01T00:00:00.000Z" };
    const newer = { id: "a", allocationCents: 2000, allocationSetAt: "2026-09-02T00:00:00.000Z" };
    expect(compareAllocationRank(older, newer)).toBeLessThan(0);
    const ranked = rankVisible([newer, older]);
    expect(ranked[0]?.id).toBe("b");
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[1]?.id).toBe("a");
  });

  test("hides listings below the floor before ranking", () => {
    const ranked = rankVisible([
      { id: "hidden", allocationCents: 0, allocationSetAt: "2026-09-01T00:00:00.000Z" },
      { id: "visible", allocationCents: 1000, allocationSetAt: "2026-09-02T00:00:00.000Z" },
    ]);
    expect(ranked.map((row) => row.id)).toEqual(["visible"]);
  });
});

describe("utcDateString", () => {
  test("uses the UTC calendar day", () => {
    expect(utcDateString(new Date("2026-09-14T00:30:00.000Z"))).toBe("2026-09-14");
    expect(utcDateString(new Date("2026-09-14T23:59:59.000Z"))).toBe("2026-09-14");
  });
});
