# Allocation-ranked board — UI plan (six screens)

## Contract understood

Rank is decided by the credits allocated to a listing. Views and shares become watch-only numbers with no effect on position. Staying on the current framework; no ranking SQL, wallet or ledger changes from this side.

Working assumptions from your brief:
- `RANKING` v0.2: $1 increments, $10 minimum to appear, $5 premium to take #1.
- Boards: All-time, Today, Daily (a specific UTC day).
- Listings with `isBoardVisible === false` never render on a public board.
- Equal allocation: earlier allocation timestamp ranks higher (display only, backend decides).

## One thing to confirm before building

This workspace does not yet contain the Layer 1 contract — `src/lib/ranking.ts` is still v0.1 (views/shares/freshness), and there is no `allocationCents`, `board` argument, `getMyWallet`, `setListingAllocation`, `adminGrantCredits`, or `dailyArchiveDatesQuery` anywhere in `src/lib`. The latest commit here is the OG rate-limit change. So the backend PR has not landed in this project's code yet.

Nothing gets built until that code is present, otherwise every screen would import functions that do not exist. When you say go, first step is pulling the merged backend code into this project; then the six screens below.

## The six screens

### 1. Board homepage (`src/routes/index.tsx`)
- Board switcher: All-time / Today / Daily, reflected in the URL alongside the existing category tabs so a board is shareable.
- Daily shows a date picker fed by the archive dates list; no date means the latest archived day.
- Header CTA: "Claim #1 for $X" using the real cost from the top listing; hidden when the board is empty.
- Empty state: honest — nobody has allocated on this board yet.
- Remove the ranks-freshness line and rising strip's dependence on view/share signals; movement stays on real position change only.

### 2. Ranked card (`src/components/board/ListingCard.tsx`)
- Allocation is the dominant number on the card; rank stays large on the left.
- Secondary line: "Take this rank for $X" (cents to overtake).
- Views and shares move to a muted watch-only row, explicitly not part of rank.

### 3. Listing detail (`src/routes/l.$slug.tsx`)
- Rank, allocation, and the listing directly above with its allocation.
- Exact overtake cost, plus "Claim #1" cost.
- Copy: "Anyone can take this rank for $X on the [Category] board."
- Share/OG card text switches to allocation and rank; keeps the versioned cache key so an old card can't overstate.

### 4. How ranking works + homepage/OG copy
- Replace the anti-pay-to-rank sections with the new one-liner: "Credits allocated to a listing determine its rank."
- Document $10 minimum, $1 increments, $5 premium for #1, tie-break by earlier timestamp, and that views/shares are watch-only.
- Update homepage headline/sub-copy and static share card text to match.

### 5. Maker dashboard (`src/routes/_authenticated/dashboard.tsx`)
- Per listing: "Not on the board until you allocate $10" when below the minimum, otherwise "You are #N" and "Add $Y to reach #N-1".
- Allocation control in $1 steps calling the allocation setter; wallet panel shows available vs committed.
- No payment/top-up flow at all.

### 6. Admin (`src/routes/_authenticated/admin.tsx`)
- Keep the review queue and audit log untouched.
- Add a grant-credits action (user, amount, reason) and a set-allocation action (listing, amount), both admin-only.

## Files I would change

- `src/routes/index.tsx`
- `src/components/board/ListingCard.tsx`
- `src/components/board/CategoryFilter.tsx` (unchanged behaviour; new sibling board-tabs component)
- new `src/components/board/BoardTabs.tsx`, `src/components/board/AllocationBadge.tsx`, `src/components/board/ClaimFirstCta.tsx`
- `src/components/board/RanksFreshness.tsx`, `src/components/board/RisingStrip.tsx` (retire or re-point to allocation)
- `src/routes/l.$slug.tsx`
- `src/routes/api/public/og/l.$slug.tsx`
- `src/routes/how-ranking-works.tsx`
- `src/routes/_authenticated/dashboard.tsx`
- `src/routes/_authenticated/admin.tsx`
- new `src/components/wallet/WalletSummary.tsx`, `src/components/listing/AllocationControl.tsx`
- `src/lib/format.ts` (new cents-to-dollars helper)

Not touched: ranking SQL, wallet/ledger tables, `src/lib/ranking.ts` constants, event recording, framework config.
