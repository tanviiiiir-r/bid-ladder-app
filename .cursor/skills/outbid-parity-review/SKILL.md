---
name: outbid-parity-review
description: Walk outbid.lol, map every public and dashboard function to Bid Ladder routes, and write or refresh docs/OUTBID_PARITY_REVIEW.md. Use when the user asks to review Outbid parity, compare dashboards, reverse-engineer Outbid UI, or list remaining board/wallet gaps.
---

# Outbid parity review

Bid Ladder copies Outbid’s **information architecture** (rank left, allocation dominant, All-time / Today / Daily, Claim #1). It does **not** copy Outbid CSS, logos, or images. Colors stay Bid Ladder gold.

## When to run

- “Review Outbid parity”
- “Compare the dashboard to Outbid”
- After a Layer 1–3 UI slice, before calling a screen done

## Do not

- Scrape private APIs, steal assets, or paste Outbid CSS
- Invent dashboard functions you did not see (mark `blocked` if login stops you)
- Build Stripe, Points, referrals, or Next.js in this review
- Treat seed listings as real traction

## Walkthrough

1. Open https://outbid.lol in a real browser. The bot wall is common — wait and retry. Do not bypass it with scrapers.
2. Capture public surfaces: homepage board, All-time / Today / Daily, category rail, ranked row, Claim #1, listing detail, auth CTAs.
3. Try the signed-in dashboard. If login blocks it, status = `blocked`. Infer only from public CTAs plus the last successful walkthrough.
4. Map each function to Bid Ladder (live UI is Lovable / `origin/main`, not a stale local checkout):

| Bid Ladder | Role |
|---|---|
| `src/routes/index.tsx` | Public board |
| `src/components/board/BoardTabs.tsx` | All-time / Today / Daily |
| `src/components/board/CategoryFilter.tsx` | Category rail |
| `src/components/board/ListingCard.tsx` | Ranked row |
| `src/routes/l.$slug.tsx` | Listing detail |
| `src/routes/how-ranking-works.tsx` | Rules copy |
| `src/routes/auth.tsx` | Sign-in |
| `src/routes/_authenticated/submit.tsx` | Submit |
| `src/routes/_authenticated/dashboard.tsx` | Maker wallet + allocate |
| `src/components/listing/AllocationControl.tsx` | $1-step allocation |
| `src/routes/_authenticated/admin.tsx` | Grant / set allocation / review |
| `src/lib/ranking.ts` | v0.2 constants |

5. Rewrite `docs/OUTBID_PARITY_REVIEW.md` using the table below. Every row needs a status and an owner.

## Comparison row

| Outbid surface / function | Bid Ladder route or server fn | Status | Visual gap | Next action |
|---|---|---|---|---|
| … | … | `done` / `partial` / `missing` / `blocked` / `out-of-scope-layer-2+` | density, type, color, chrome | Cursor vs Lovable |

Status meanings:

- `done` — function exists and matches the product rule
- `partial` — function exists but UX/visuals are thinner than Outbid
- `missing` — Bid Ladder has no equivalent in Layer 1
- `blocked` — could not verify on Outbid (login/bot wall)
- `out-of-scope-layer-2+` — Stripe top-up, listing fee, Points, referrals

## Required function checklist

Score at least these Outbid functions:

- Board switcher (All-time / Today / Daily, UTC)
- Category rail (full taxonomy)
- Claim #1 CTA from live cost
- Ranked row: rank left, allocation dominant, watch-only extras
- Listing detail: overtake copy, who is above, off-board state
- Deferred auth (browse first, sign in to act)
- Maker dashboard: available vs committed, allocate/release, “You are #N”
- Buy-credits / listing fee / Points / referrals (Layer 2–3 only)

## Output

Overwrite `docs/OUTBID_PARITY_REVIEW.md` with:

1. Date and how the walkthrough was done (live browser / blocked / inferred)
2. The comparison table
3. Dashboard-only section (every control, even if blocked)
4. Visual/brand gaps (structure to copy, red prices **not** to copy)
5. Ordered next actions (Lovable one screen at a time; Cursor owns contract/seed)

Keep the file honest. A `partial` row is more useful than a fake `done`.
