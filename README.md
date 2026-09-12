# Bid Ladder

Build Bid Ladder — a regional discovery + competitive attention platform. Thin MVP only.

## Product thesis
- The board IS the homepage (discovery first, not a marketing landing page).
- Core visitor question: "What's getting attention right now?"
- Core maker question: "Can I get mine higher?"
- Competition must be REAL — no fake bids, users, rankings, or seeded popularity.
- Launch wedge: Product Hunt–style early-stage makers, global; first focus AI/SaaS/tools. NOT a generic directory. NOT Outbid.lol pay-to-rank as the truth layer.
- Discovery before monetization. Mobile-first.

## Thin MVP scope (build ONLY this)
1. Public leaderboard/board (global + category filter)
2. Auth (magic link and/or OAuth)
3. Submit listing flow (name, tagline, url, description, category)
4. Admin review queue: approve / reject with reason + audit log
5. Ranking v0.1 from REAL signals only: unique views, share events if measurable, freshness/recency — NO payments/credits in score
6. Share card for approved listings (rank + movement)
7. Movement badges (↑/↓ vs previous recompute)

## Explicitly OUT OF SCOPE
Payments, credits, bids marketplace, referrals, fake activity, task marketplace, social network, crypto, pay-to-rank.

## Stack
React + Tailwind + shadcn via Lovable. Prefer Supabase (Postgres + Auth + Realtime + RLS) for backend when connecting Lovable Cloud / Supabase. GitHub product repo target: tanviiiiir-r/bid-ladder-app (connect when possible).

## Data entities
listings (pending/approved/rejected), categories (minimal: AI, SaaS, Tools), rankings, users, events, admin_audit_log.

## Roles
visitor (public board), listing_owner (submit), admin (approve/reject).

## Acceptance
- Homepage shows board immediately
- Pending listings never public
- Only approved listings ranked
- Service role never in client
- Mobile-friendly

Start with a clean board-first UI shell + listing cards + category filter + placeholder ranking, then wire auth and submit/admin flows. English UI. Keep it simple and beautiful.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6e05f72b-e75f-4175-a163-ef7e3b9791d9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
