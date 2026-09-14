# Outbid parity review

Date: 2026-09-14  
Walkthrough: live browser on [outbid.lol](https://outbid.lol) (homepage, `/today`, `/daily`, listing detail, `/about`, `/rules`, claim → Dodo checkout). Dashboard login was **not present** — Outbid is pay-per-claim, not a signed-in wallet product.

Bid Ladder source of truth for this map: `origin/main` / Lovable UI (Layer 1 screens). Do not copy Outbid CSS, logos, or images.

## How Outbid actually works

- Public boards: **All-time** and **Today** as peer tabs; **Daily** is a separate archive of UTC days (live day + closed days).
- Ranked row: rank badge left, logo, name, short description, category, time ago, domain, **clicks**, **price in coral/orange**.
- Hero: **Claim #1 for $X** plus URL + category form. Checkout is anonymous via Dodo Payments. No account, no wallet.
- Rules (public): $10 min, $1 steps, #1 costs current #1 + $5, raise the same URL and pay only the delta.
- Listing detail: visit + copy link, category rank vs overall rank, “Anyone can take this rank for $X on the [Category] board,” related listings.
- **No maker dashboard, no credits wallet, no referrals, no Points** were reachable. Those Bid Ladder screens are our Layer 1 stand-in until Stripe exists.

## Comparison

| Outbid surface / function | Bid Ladder route or server fn | Status | Visual gap | Next action |
|---|---|---|---|---|
| All-time / Today board tabs | `src/routes/index.tsx` + `BoardTabs.tsx` + `boardQuery` | `partial` | Tabs exist; Outbid’s All-time/Today sit as coral pills next to a denser row list; ours are isolated above the filter | Lovable: sit tabs with the list; keep gold, not coral |
| Daily archive (UTC days, live countdown, frozen days) | `index.tsx` Daily tab + `dailyArchiveDatesQuery` + `getDailyArchiveDates` | `partial` | We have a date select; Outbid shows a stack of day cards, live countdown, top-3 preview per closed day | Lovable: day cards + “today (live)” copy; Cursor already freezes at UTC midnight |
| Horizontal category rail (All + taxonomy) | `CategoryFilter.tsx` + `getCategories` | `partial` | Same idea; Outbid is denser pills with icons and an Explore overflow | Lovable: denser rail; keep Bid Ladder tokens |
| Claim #1 hero (price + URL form + checkout) | Homepage CTA `Claim #1 for $X+` → `/submit` | `partial` | We show the live cost; we do not inline-claim or charge | Lovable: enlarge gold price; Cursor: Stripe claim later (Layer 2) |
| Ranked row: rank left, price dominant | `ListingCard.tsx` | `partial` | Allocation is large but still gray; Outbid’s price is the loudest color; we lack logo, domain, time-ago | Lovable: gold `--allocation` price, tighter row, optional logo/domain |
| Clicks / views as secondary | `ListingCard` unique views + shares | `done` | Ours are correctly watch-only; Outbid shows clicks as a row stat | Keep muted; do not feed rank |
| Listing detail + overtake sentence | `src/routes/l.$slug.tsx` | `partial` | Copy matches; missing category-vs-overall ranks and “Also in category” | Lovable: related strip; keep gold |
| Off-board / not yet allocated | `l.$slug.tsx` + dashboard ClimbPanel | `done` | Honest “not on the board until $10” | Keep |
| Rules / how ranking works | `how-ranking-works.tsx` vs `/rules` | `done` | Rules are v0.2 allocation; visual is card-stack not a single legal page | Optional Lovable polish |
| About / live visitor stats | none | `out-of-scope-layer-2+` | Outbid shows online count and marketing stats | Do not invent numbers |
| Deferred / anonymous claim | Browse public, pay without account | `partial` | We require review + auth to submit; browse is public | Keep review; Stripe later can defer pay |
| Sign in | `src/routes/auth.tsx` | `done` | Outbid has no equivalent | Keep |
| Submit + admin review | `submit.tsx` + `admin.tsx` `reviewListing` | `done` | Outbid lists immediately after pay; we review first | Keep — product choice |
| Maker dashboard: available vs committed | `dashboard.tsx` + `getMyWallet` | `done` (Bid Ladder–only) | Outbid has no wallet; ours is the Layer 1 credit stand-in | Lovable: tighter chrome using brand contract |
| Allocate / release in $1 steps | `AllocationControl.tsx` + `setListingAllocation` | `done` (Bid Ladder–only) | Functional; not as loud as Outbid’s checkout price | Lovable: gold price display |
| “You are #N” / add $Y to reach #N-1 | `dashboard.tsx` ClimbPanel | `done` | Matches the coaching Outbid puts on the detail page | Keep |
| Buy credits / pay the delta | Dodo checkout | `out-of-scope-layer-2+` | No Stripe yet; admin grant only | Cursor Layer 2 |
| Listing fee | Checkout line item | `out-of-scope-layer-2+` | — | Later |
| Points / referrals | Not found on Outbid | `out-of-scope-layer-2+` | — | Later |
| Admin grant + set allocation | `admin.tsx` `adminGrantCredits` / `adminSetAllocation` | `done` | Ops-only; Outbid has no equivalent | Keep |
| Search | Header search icon | `missing` | — | Lovable later, not Layer 1 blocker |
| Dark / light toggle | `ThemeToggle` | `done` | Both have it | Apply brand tokens in both themes |

## Dashboard functions (Outbid vs us)

Outbid dashboard: **blocked / does not exist**. Every “dashboard” function below is inferred from public claim + rules, then mapped to our authenticated screens.

| Function | Outbid | Bid Ladder | Status |
|---|---|---|---|
| See my listings | Not found | `/dashboard` | Bid Ladder only — keep |
| Wallet available / committed | Not found (pay at claim) | `getMyWallet` | Layer 1 stand-in for Stripe |
| Raise allocation | Re-enter same URL, pay delta | `setListingAllocation` $1 steps | `done` |
| Release allocation | Not found | “Release all” → 0, leaves board | Bid Ladder only |
| Buy credits | Immediate Dodo checkout | Missing | Layer 2 |
| You are #N / cost to climb | On listing detail | Dashboard ClimbPanel | `done` |
| Admin grant | Not found | `/admin` | Keep for preview/dev |

## Visual / brand gaps

Copy **structure**, not **coral**:

- Rank left, allocation the loudest number, extras muted
- Board tabs + category rail above a dense list
- Claim #1 as the hero action with a live dollar figure
- Dark and light both finished

Do **not** copy:

- Coral/orange `#FF6B4A`-style prices
- Outbid wordmark, logos, or row icons
- Marketing stats (visitor counts, revenue)

Bid Ladder color: gold/amber `--primary` / `--allocation` in [`docs/BRAND_CONTRACT.md`](BRAND_CONTRACT.md).

## Ordered next actions

1. **Cursor (this branch):** brand tokens + wipeable Cloud preview seed so All-time/Today are not empty.
2. **Lovable (one screen at a time, after this lands):** denser board rows, gold allocation, Daily day-cards, related listings on detail. Stay on Vite.
3. **Cursor later:** Stripe claim/top-up (Layer 2). Points/referrals (Layer 3).
4. **Never:** publish seed users, or present `[SEED]` listings as real traction.

## Re-run

Use the project skill [`.cursor/skills/outbid-parity-review/SKILL.md`](../.cursor/skills/outbid-parity-review/SKILL.md).
