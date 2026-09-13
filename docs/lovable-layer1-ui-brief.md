# Lovable UI brief — Layer 1 allocation boards

Cursor owns ranking, wallets, and the data contract. Lovable owns every screen.
Do **not** rewrite the app to Next.js. Stay on TanStack Start + Vite + existing shadcn components.

Backend is on branch `cursor/layer-1-allocation-ranking-b505` (PR #2). Apply the new Supabase migration before these screens can show paid ranks.

## Ranking (do not reimplement)

- Rank = active allocation. Views/shares/freshness never affect rank.
- Public boards hide listings with `allocationCents < 1000` (`isBoardVisible === false`).
- $1 increments. Taking **#1** costs current #1 **+ $5**.
- All-time = current allocation. Today / Daily = UTC calendar day.
- Import constants from `@/lib/ranking` (`RANKING.incrementCents`, `minVisibleCents`, `numberOnePremiumCents`). Do not hard-code dollars.

## Data contract

```ts
getBoard({ data: { category, board: "all_time" | "today" | "daily", date?: "YYYY-MM-DD" } })
// BoardListing now includes:
// allocationCents, costToOvertakeCents, costToClaimFirstCents, board, isBoardVisible

boardQuery(category, board?, date?)
listingQuery(slug, board?, date?)
dailyArchiveDatesQuery()
getMyWallet()
setListingAllocation({ listingId, newCents })
adminGrantCredits({ userId, cents, reason?, idempotencyKey? })
adminSetAllocation({ listingId, newCents })
```

Existing `boardQuery(category)` still works (defaults to All-time).

Visual reference: [outbid.lol](https://outbid.lol) — ranked cards, red/emphasized price, `Claim #1 for $X+`, category tabs, listing detail with exact overtake cost.

---

## Screen 1 — Board (`src/routes/index.tsx`)

Add All-time / Today / Daily tabs. Keep `CategoryFilter`.
Homepage CTA: `Claim #1 for $X+` using `costToClaimFirstCents` from the first row (or `RANKING.minVisibleCents` if the board is empty).
Daily: date picker from `dailyArchiveDatesQuery()`; today is live.

## Screen 2 — Card (`src/components/board/ListingCard.tsx`)

Emphasize allocation (e.g. `$170.00`). Demote unique views / shares to watch-only. Keep rank + movement badge. Drop any implied score-from-attention.

## Screen 3 — Listing detail (`src/routes/l.$slug.tsx`)

Show current rank, current allocation, who is immediately above, exact cents to overtake, resulting rank.
Copy: `Anyone can take this rank for $X on the [Category] board.`
If `isBoardVisible === false`: do not pretend it is ranked. Climb CTA may link to dashboard.

## Screen 4 — How ranking works + public copy

Reverse anti-pay-to-rank language in `how-ranking-works.tsx`, homepage meta, OG tags.
One sentence: **Credits allocated to a listing determine its rank.**
Use `RANKING.version` (`v0.2`) and the allocation rules, not view/share/freshness weights.

## Screen 5 — Dashboard (`src/routes/_authenticated/dashboard.tsx`)

If approved and not on the board: **Not on the board until you allocate**.
If on the board: `You are #N`, current allocation, `#N-1 is $X`, `Add $Y to reach #N-1`.
Show `getMyWallet()` available vs committed. No Stripe UI.

## Screen 6 — Admin (`src/routes/_authenticated/admin.tsx`)

Add controls that call `adminGrantCredits` and `adminSetAllocation` (user id + cents, listing id + new cents). Keep the existing review queue and `recomputeRankings`.

---

## Out of scope for Lovable

- Stripe checkout / webhooks
- Points, referrals, share rewards
- Changing `recompute_rankings` or ledgers
- Migrating to Next.js
