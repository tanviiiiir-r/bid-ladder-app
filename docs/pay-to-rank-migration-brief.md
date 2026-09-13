# Pay‑to‑Rank Migration — Research & Implementation Brief

> **Audience:** LLM coding/research agents (e.g. GPT models) tasked with researching and
> implementing this migration.
> **Status:** Planning. No implementation has started. Do **not** write code from this brief
> alone — first produce the research deliverables in §11 and get the open decisions in §5
> answered.
> **Repo:** `rising-star-board` (product name: **Bid Ladder**). Lovable‑connected, so the
> connected branch syncs back to Lovable — never rewrite published git history.

---

## 1. Purpose & how to use this brief

Bid Ladder is currently a **discovery board that explicitly forbids pay‑to‑rank**: listings are
ranked purely by organic signals (unique views, shares, freshness). The product owner wants to
**reverse this entirely** into a **paid‑rank economy**:

- **Money buys rank.** Board position is ordered by how much credit a listing's owner commits.
- **Views/shares become watch‑only.** They are displayed but never enter the ranking formula.
- **Points are a second currency**, earned via **referrals** and **milestones**, that **convert
  into spendable credit**. Credit buys rank, lists a business, and other in‑app purchases.
- **Closed loop, top‑up only.** Money and points flow **in** and become wallet credit. Credit is
  **never** cashable out — it can only be spent inside the app.

Use this brief to (a) run the research tasks in §11, (b) confirm the open decisions in §5, then
(c) implement in the phased order of §8/§9 with the verification of §10. Every code path,
constraint, and file reference you need to be accurate is listed in §12.

---

## 2. Current architecture (baseline to migrate FROM)

**Stack:** TanStack Start (React 19 + Vite 8, SSR), Bun package manager, Supabase (Postgres +
Auth + Realtime + `pg_cron`). Deploys via Nitro/Cloudflare. Auth = Supabase email + Google
(through Lovable). Listings are owner‑submitted and admin‑approved. RLS is strict; all privileged
writes go through **service‑role server functions**, never the client.

**Ranking is computed in the database, not the app.** The function
`public.recompute_rankings()` (in `supabase/migrations/20260912184725_*.sql`) writes the
`rankings` table and is executed:
- every 5 minutes by a `pg_cron` job (`supabase/migrations/20260912235644_*.sql`), and
- immediately after an admin approves/rejects a listing (`src/lib/admin.functions.ts`).

Current formula (the thing being removed):

```
freshness_days = max(0, 30 - days_since(approved_at || created_at))
score          = unique_views * 3.0 + shares * 5.0 + freshness_days * 1.5
rank           = ROW_NUMBER() OVER (ORDER BY score DESC, listing_id)
```

The formula is mirrored in **three** places that must stay in sync: the SQL function above, the
`RANKING` constants in `src/lib/ranking.ts`, and the public explainer page
`src/routes/how-ranking-works.tsx`.

**Signals pipeline:** deduped `events` rows (one per `(listing, kind, visitor)`) are written only
by the server‑only `record_event` RPC (approval check + per‑visitor rate limit;
`supabase/migrations/20260912230535_*.sql`), then aggregated into `rankings.unique_views` /
`rankings.shares` during recompute.

**Money does not exist anywhere today** — no wallet, no payments, no Stripe, no `amount_paid`.

**Anti‑pay‑to‑rank is hard‑coded across the product** and must be deliberately reversed:
`src/routes/index.tsx`, `src/routes/how-ranking-works.tsx`, `src/routes/l.$slug.tsx`,
`src/routes/api/public/og/l.$slug.tsx`, and a rule in `README.md`:
*"Do not invent prices, fake rankings, or pay‑to‑rank as the truth layer."*

---

## 3. Target model (the economy, made explicit)

```
Real money (Stripe) ─┐
                     ├─► Wallet credit ─► buy rank / list business / other in-app spend
Points (referral,    │        (spend-only; NEVER withdrawable to cash)
       milestones) ──┘   (points → credit at a fixed one-way rate)
```

- **Two currencies, one sink.** Money and points both resolve to **wallet credit**. Credit is the
  only thing that buys rank.
- **Rank formula contains no view/share term.** Views/shares only influence rank *indirectly*, by
  minting points that an owner may convert and spend. This resolves the earlier ambiguity: the
  ranking algorithm is purely economic.
- **Currency units:** store money as integer **cents**; points as integers. Never floats.

---

## 4. Locked decisions (already confirmed by product owner)

1. **No cash‑out.** Closed‑loop, spend‑only credit. Top‑up only; there is no credit→cash path in
   any RPC or UI. Points→credit conversion is one‑way.
2. **Two currencies → one wallet credit balance** (money + converted points).
3. **Views/shares are watch‑only** and are removed from the ranking formula.
4. **Milestones and referrals grant points**, which convert to credit that can buy rank.

---

## 5. Open decisions (MUST be answered before/within implementation)

These are the blocking product decisions. Research §11 should recommend defaults for each.

1. **Rank ordering model:**
   - **A — Cumulative spend:** total money ever committed; simple but an early whale stays #1.
   - **B — Live bid/allocation (recommended):** each listing's *current* committed amount; outbid
     by spending more; supports refund/withdraw of allocation to credit.
   - **D — Time‑decaying boost:** committed amount decays each recompute, forcing ongoing spend
     (recurring revenue; reuses the existing 5‑min cron + decay concept).
2. **Points→credit rate** (e.g. `100 points = $1`) and any conversion minimum.
3. **Rank granularity:** per listing or per business/user? Can one user own multiple listings?
4. **Milestone definitions:** which metric(s) (views/shares/referrals), thresholds, reward points,
   and whether scope is per‑listing or per‑user.
5. **Referral rules:** who earns, the **qualifying event** (recommended: referred user's first
   successful payment), and per‑user caps.
6. **"List business and various things":** exact catalog of what credit can buy beyond rank
   (submission/listing fee? featured slots? category placement?).
7. **Refund/outbid policy:** when a listing is outbid or withdrawn, does its allocation return to
   spendable credit or is it consumed?
8. **Currency, pricing tiers, minimum purchase.**
9. **Payment provider:** Stripe via the Lovable connector — confirm.
10. **Freshness:** keep as a rank tie‑breaker, or drop entirely?
11. **Sign‑off** to reverse all anti‑pay‑to‑rank copy and the `README.md` rule.

---

## 6. Scope

### In scope
- New data model for wallets, ledger, payments, rank allocation, referrals, milestones (§7.1).
- Stripe payment integration: checkout + idempotent webhook + wallet crediting (§7.2).
- Points/referral/milestone earning + one‑way conversion to credit (§7.3).
- Rewritten `recompute_rankings()` ordered by committed credit; views/shares kept for display and
  milestone detection only (§7.4).
- New authenticated UI (wallet, buy credit, boost/allocate rank, referrals) + full copy reversal
  and rewritten `how-ranking-works` page (§7.5).
- RLS, anti‑abuse, and financial‑integrity controls (§7.6).
- Phased, reversible migration + verification (§9, §10).

### Out of scope (unless a decision in §5 expands it)
- Any **cash‑out / payout / withdrawal** rails, Stripe Connect, or KYC for payouts (excluded by the
  locked no‑cash‑out decision).
- Crypto/tokenization of points.
- Non‑Stripe payment providers (unless §5.9 changes).
- Redesign of auth, categories, or the admin review workflow beyond what money/rank requires.

---

## 7. Workstreams — scope & goals

### 7.1 Data model
**Goal:** an auditable, race‑safe schema where every balance change is a ledger row and balances
always reconcile to the ledger sum.
**Scope (additive, integer cents/points):**
- `wallets(user_id PK, credit_cents, points, updated_at)`
- `wallet_ledger(id, user_id, type, credit_delta_cents, points_delta, ref_type, ref_id,
  idempotency_key, created_at)` — append‑only.
- `payments(id, user_id, provider, provider_payment_id UNIQUE, amount_cents, currency, status,
  created_at)`
- rank commitment: `rank_allocations(id, listing_id, user_id, amount_cents, created_at)` **or**
  `listings.rank_spend_cents` (depends on §5.1 model).
- `referral_codes(user_id PK, code UNIQUE)`, `referrals(id, referrer_id, referred_id UNIQUE,
  status, reward_points, qualified_at, created_at)`.
- `milestones(id, metric, threshold, reward_points, scope)`,
  `milestone_awards(subject_type, subject_id, milestone_id)` UNIQUE together (dedupe).
- Extend `rankings` with `rank_spend_cents` for display; keep `unique_views`/`shares`.

**Invariant:** `wallets.credit_cents == SUM(wallet_ledger.credit_delta_cents)` per user (same for
points). Enforce via tests and, where feasible, DB checks/triggers.

### 7.2 Payments (Stripe)
**Goal:** users add credit with real money, confirmed exactly once, with full reconciliation.
**Scope:**
- Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`.
- Server fn creates Checkout Session / PaymentIntent.
- New webhook route `src/routes/api/webhooks/stripe.tsx` that **verifies the Stripe signature**
  (mirror the HMAC/`timingSafeEqual` pattern in `src/integrations/supabase/cron-auth.ts`), is
  **idempotent on the Stripe event id**, writes a `payments` row, and credits the wallet via one
  SECURITY DEFINER RPC.
- Handle refund/dispute webhooks → reverse credit (allow negative balance / suspend rank if
  already spent).
**Non‑goal:** payouts/withdrawals.

### 7.3 Points, referrals & milestones
**Goal:** a fraud‑resistant way to earn points and convert them one‑way to credit.
**Scope:**
- Referral codes per user; reward granted only after the **qualifying event** (§5.5); block
  self‑referral; one reward per referred user; enforce caps.
- Milestone detection during recompute: when a subject crosses a `milestones.threshold` not in
  `milestone_awards`, grant `reward_points` and record the award (dedupe).
- `convert_points` RPC: atomically debit points, credit `credit_cents`, log one ledger row, at the
  §5.2 rate. One‑way only.

### 7.4 Ranking algorithm
**Goal:** board ordered purely by committed credit; views/shares no longer affect order.
**Scope:** rewrite `public.recompute_rankings()` to:
```
rank = ROW_NUMBER() OVER (
         ORDER BY effective_rank_spend_cents DESC,
                  <tie-breaker per §5.10>,
                  listing_id )
```
where `effective_rank_spend_cents` is defined by the §5.1 model (cumulative / live bid /
decaying). Keep aggregating `unique_views`/`shares` for display + milestone detection. Update the
mirror in `src/lib/ranking.ts` and the `how-ranking-works` page in the same change (existing
sync rule).

### 7.5 Frontend & copy
**Goal:** honest UI for the paid model; remove every "money never buys rank" claim.
**Scope:**
- Rewrite `src/routes/how-ranking-works.tsx` (paid rank + points + referrals; delete the "Money
  never buys organic position" section and the "paying for position" entry under *What never
  affects rank*).
- Update copy in `src/routes/index.tsx`, `src/routes/l.$slug.tsx`,
  `src/routes/api/public/og/l.$slug.tsx`.
- New authenticated routes under `src/routes/_authenticated/`: `wallet.tsx` (balance, buy credit,
  convert points), `boost.tsx` (allocate credit to a listing's rank), `referrals.tsx` (code,
  invites, points).
- New server functions: `src/lib/wallet.functions.ts`, `src/lib/payments.functions.ts`,
  `src/lib/referral.functions.ts` (all behind `requireSupabaseAuth`).
- `src/components/board/ListingCard.tsx`: keep views/shares as watch‑only; optional "boosted"
  indicator.
- Update `README.md` rule (needs §5.11 sign‑off).

### 7.6 Security, RLS & anti‑abuse
**Goal:** no double‑spend, no client‑forged balances, idempotent money paths.
**Scope:**
- All balance/rank mutations in `SECURITY DEFINER` RPCs using row locks (`SELECT … FOR UPDATE`) +
  idempotency keys; the app calls them via the service‑role client
  (`src/integrations/supabase/client.server.ts`).
- RLS: `wallets`/`wallet_ledger`/`payments` readable only by owner (+admin), writable only by
  `service_role`.
- Extend `admin_audit_log` to money/rank actions; reuse the `record_event` rate‑limit pattern.
- Referral fraud guards (§7.3).

---

## 8. Implementation phases (build order)

0. **Decisions & setup** — resolve §5; add Stripe test secrets; add a `PAY_TO_RANK_ENABLED`
   feature flag.
1. **Additive schema** — ship §7.1 tables/columns; backfill wallets to 0; no behavior change.
2. **Payments plumbing (flagged, test mode)** — checkout + webhook + wallet credit; no rank impact.
3. **Points/referral/milestones** — earning + one‑way conversion behind the flag.
4. **Shadow ranking** — new money‑ordered recompute writes to a separate `rank_shadow` column;
   compare vs live rank without changing the visible board.
5. **Cutover** — flip `recompute_rankings()` to money order, publish new copy + UI, enable live
   purchases. Keep the previous function version for rollback.
6. **Cleanup** — drop the old formula's contribution; finalize docs.

---

## 9. Migration & rollout constraints
- **Additive first.** Phases 1–4 must not change the visible board (reversible/no‑op).
- **Cutover is a toggle.** Phase 5 = feature flag + `recompute_rankings()` version swap.
- **Lovable/git:** ship migrations as **new timestamped files** in `supabase/migrations/`; never
  rewrite or squash pushed history; keep the branch working. Migrations must also be applied to the
  hosted Supabase DB.
- **Rollback per phase:** additive schema is safe to leave; ranking cutover reverts by flag +
  restoring the prior function version.

---

## 10. Verification & testing plan (definition of done)
- **DB unit tests:** ordering by committed credit; ledger invariant (balance == Σ ledger);
  milestone dedupe; conversion math; idempotency.
- **Payments e2e (Stripe test mode):** purchase credits wallet; duplicate webhook is idempotent;
  refund/chargeback reverses credit.
- **Concurrency:** parallel rank‑spend calls — no double‑spend, deterministic order.
- **Referral e2e:** signup via code → reward only after qualifying event; self‑referral blocked;
  cap enforced.
- **Manual e2e (recorded walkthrough):** buy credit → boost a listing → board reorders; earn
  referral points → convert → spend.
- **Financial reconciliation:** Stripe dashboard totals == `payments` == wallet credits from
  purchases.
- **Regression:** `bun run lint`, `bun run typecheck`, `bun run build`, and CI stay green.
- **Security review** of all money/rank paths before live cutover.

---

## 11. Research deliverables expected from the GPT models
1. **Recommended defaults + rationale** for every open decision in §5 (especially the rank model,
   points rate, referral qualifying event, and tie‑breakers).
2. **Legal/compliance research** for a closed‑loop, non‑withdrawable credit + paid ranking +
   points/referrals: consumer‑protection, advertising‑disclosure ("paid placement" labeling),
   tax/VAT on credit purchases, and whether an auction/bid model has gambling‑style exposure by
   jurisdiction. Output required disclosures and T&C points.
3. **Stripe integration design** for TanStack Start SSR + Supabase: Checkout vs PaymentIntents,
   webhook verification, idempotency, refund/dispute handling, and test strategy.
4. **Concrete DB migration set** (SQL) implementing §7.1 + rewritten `recompute_rankings()` for the
   chosen rank model, with RLS policies and SECURITY DEFINER RPCs (locking + idempotency).
5. **Anti‑abuse design** for referrals/milestones and rank spending (fraud vectors + mitigations).
6. **UX flows + copy** for wallet, buy‑credit, boost/allocate, referrals, and the rewritten
   `how-ranking-works` page.
7. **Test suite plan** mapping each §10 item to specific automated/manual tests.

Each deliverable should cite the exact files/DB objects in §12 it touches.

---

## 12. Reference — key files & DB objects
**Ranking (source of truth + mirrors):**
- `supabase/migrations/20260912184725_*.sql` — `public.recompute_rankings()` (rewrite target).
- `supabase/migrations/20260912235644_*.sql` — `pg_cron` job `recompute-rankings` (every 5 min).
- `src/lib/ranking.ts` — `RANKING` constants mirror.
- `src/routes/how-ranking-works.tsx` — public formula explainer (full rewrite).

**Signals / events:**
- `supabase/migrations/20260912230535_*.sql` — `record_event` RPC (approval + rate limit + dedupe).
- `supabase/migrations/20260912184725_*.sql` — base tables: `listings`, `events`, `rankings`,
  `categories`, `user_roles`, `profiles`, `admin_audit_log`.

**Server functions / read + write paths:**
- `src/lib/board.functions.ts` — public board reads (`getBoard`/`getListing`/`getCategories`),
  `trackEvent`, visitor‑key minting.
- `src/lib/listings.functions.ts` — `submitListing`, `getMyListings`.
- `src/lib/admin.functions.ts` — review queue, `reviewListing`, `recomputeRankings`, audit log.
- `src/integrations/supabase/client.server.ts` — service‑role client (privileged RPCs).
- `src/integrations/supabase/auth-middleware.ts` — `requireSupabaseAuth`.
- `src/integrations/supabase/cron-auth.ts` — HMAC/`timingSafeEqual` pattern to reuse for the
  Stripe webhook.

**Copy to reverse (anti‑pay‑to‑rank):**
- `src/routes/index.tsx`, `src/routes/l.$slug.tsx`, `src/routes/api/public/og/l.$slug.tsx`,
  `README.md`.

**Auth/UI entry points:**
- `src/routes/auth.tsx`, `src/routes/_authenticated/{route,dashboard,submit,admin}.tsx`,
  `src/components/board/ListingCard.tsx`, `src/hooks/useSession.ts`.

**Secrets (env) relevant to this work:**
- Existing: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_CRON_SECRET`.
- New (payments): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`.

---

## 13. Glossary
- **Credit** — closed‑loop, spend‑only balance in cents; buys rank/listings/other. Never cashable.
- **Points** — earned via referrals/milestones; convert one‑way to credit.
- **Rank spend / allocation** — credit committed to a listing to set its board position.
- **Milestone** — a views/shares/referrals threshold that grants points once (deduped).
- **Qualifying event** — the action (recommended: referred user's first payment) that unlocks a
  referral reward.
- **Recompute** — the DB job that (re)writes the `rankings` table; runs on a 5‑min cron and after
  admin review.
