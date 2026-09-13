# FUTURE NEXT.JS MIGRATION CONTEXT — BID LADDER

> Canonical context for the future Vite → Next.js migration.
> Do not use this document to trigger the migration now.
> The current goal is to launch and validate the Vite MVP first.

## 1. Purpose

Bid Ladder will launch first as a working MVP using the existing Loveable-generated Vite/React application.

The future goal is to migrate the validated product to a production-hardened Next.js App Router architecture.

This is an **architecture upgrade, not a product rewrite**.

The validated product rules, data model, financial model, ranking model, and useful UX should survive the migration unless a separate product decision changes them.

---

## 2. Strategic Plan

```text
LOVEABLE-GENERATED VITE APP
        ↓
WORKING MVP
        ↓
INITIAL LAUNCH
        ↓
REAL USERS + REAL PAYMENTS
        ↓
VALIDATE PRODUCT LOOP
        ↓
IDENTIFY REAL SCALE / SEO / RELIABILITY NEEDS
        ↓
NEXT.JS MIGRATION
        ↓
PRODUCTION-HARDENED BID LADDER
```

Do not migrate prematurely.

Vite V1 exists to validate:

- founder/product adoption
- $9 listing conversion
- Credit purchases
- competitive ranking behavior
- Daily engagement
- category demand
- sharing
- referrals
- Points behavior
- repeat usage

---

## 3. Core Product Rules That Must Survive

### Ranking

```text
active Credit allocation → rank
```

Higher active allocation ranks higher.

Equal allocation is resolved deterministically, initially by earlier allocation time.

The old organic ranking model must not return.

Views, shares, freshness, likes, comments, and Points do not directly determine rank.

### Credits

Credits are the paid currency.

```text
Stripe
  ↓
payment
  ↓
credit ledger
  ↓
available Credits
  ↓
allocation
  ↓
rank
```

### Points

Points are a separate game/economy currency.

```text
Points ≠ rank
```

Points may eventually be converted to Credits or used for future product activities.

### Boards

Maintain:

- All-time
- Today
- Daily
- category-specific versions of those boards

### Categories

Use the proven Outbid-style taxonomy as the starting taxonomy.

Categories are first-class database entities.

### Listings

Listing identity is separate from payments.

Raising an existing listing must not create a duplicate listing.

---

## 4. Why We Eventually Migrate to Next.js

The migration is justified when Bid Ladder becomes a public discovery platform rather than only a dashboard/application.

Expected public surfaces include:

```text
/
 /today
 /daily
 /daily/[date]

 /category/[slug]
 /category/[slug]/today

 /listing/[slug]

 /trending
 /news/[slug]
```

Future product capabilities may include:

- many category pages
- product/listing pages
- Daily archive pages
- rank history
- trending
- AI/news pages
- product/company discovery
- SEO landing pages
- shareable achievements

Next.js should provide a stronger foundation for:

- server-rendered public pages
- SEO metadata
- static/dynamic rendering
- route organization
- server-side application logic
- scalable public discovery

Do not migrate merely because Next.js is popular.

---

## 5. What Vite V1 Is

Vite V1 is the **validation application**.

It should be good enough to:

- launch publicly
- process real users
- process real Stripe payments
- manage listings
- manage Credits
- allocate Credits
- rank listings
- operate All-time/Today/Daily
- operate categories
- issue Points
- operate referrals
- reward shares
- provide basic analytics

V1 does not need the final production architecture.

However, security and financial correctness are never disposable MVP concerns.

---

## 6. What NOT to Do During Migration

Do not:

- rewrite the product from scratch
- redesign the product without a product reason
- change ranking rules merely because of the framework migration
- change the Points economy without a separate product decision
- change the Credit model without a separate product decision
- casually change the category taxonomy
- migrate databases just for the sake of migration
- replace Supabase without a compelling reason
- replace Supabase Auth without a compelling reason
- create a second financial source of truth
- move financial calculations into the browser
- trust frontend balances, prices, rank, or reward eligibility
- remove ledger-based accounting
- reintroduce views/shares/freshness as ranking inputs

The migration must separate:

```text
framework change
```

from:

```text
product change
```

---

## 7. Existing Loveable Application

The current application was created using Loveable.

Treat it as valuable source material.

Before migration, audit the actual repository.

### KEEP

Mostly presentation:

- visual design
- components
- layouts
- navigation
- responsive styling
- forms
- useful UI patterns

### REFACTOR

Application concerns:

- routing
- data fetching
- Supabase client patterns
- authentication
- server functions
- listing management
- admin flows

### REPLACE

Business logic that conflicts with Bid Ladder:

- organic ranking
- client-side financial calculations
- unsafe payment fulfillment
- mutable balances as source of truth
- insecure reward logic
- non-atomic allocation updates

Do not assume Loveable code is bad. Preserve good work.

---

## 8. Target Next.js Architecture

Conceptually:

```text
Next.js App Router
│
├── Public Discovery
│   ├── Homepage
│   ├── Categories
│   ├── All-time
│   ├── Today
│   ├── Daily
│   ├── Listing pages
│   ├── Trending
│   └── Future News
│
├── Owner Application
│   ├── Dashboard
│   ├── Listings
│   ├── Wallet
│   ├── Credits
│   ├── Points
│   └── Referrals
│
├── Admin
│   ├── Review
│   ├── Moderation
│   ├── Support/payment tools
│   └── Audit
│
└── Server/API layer
    ├── Stripe
    ├── allocations
    ├── wallet
    ├── Points
    └── notifications
```

Backend:

```text
Supabase
│
├── PostgreSQL
├── Auth
├── RLS
├── RPC/transactions
└── Storage
```

The database remains the financial and ranking source of truth.

---

## 9. Suggested Next.js Routes

Conceptually:

```text
app/
├── page.tsx
│
├── today/
│   └── page.tsx
│
├── daily/
│   ├── page.tsx
│   └── [date]/
│       └── page.tsx
│
├── category/
│   └── [slug]/
│       ├── page.tsx
│       └── today/
│           └── page.tsx
│
├── listing/
│   └── [slug]/
│       └── page.tsx
│
├── dashboard/
├── wallet/
├── points/
│
├── admin/
│
└── api/
    └── stripe/
        └── webhook/
            └── route.ts
```

The exact structure may change if there is a better technical reason.

Public URLs should remain clean, stable, indexable, and shareable.

---

## 10. Server vs Client

Use Server Components for primarily read/display public data where appropriate.

Good server-side candidates:

```text
leaderboard data
category data
listing data
Daily archive
SEO metadata
public ranking information
```

Client Components should handle interaction:

```text
allocation buttons
wallet interactions
modals
interactive forms
share controls
live UI
```

Do not make the entire application a Client Component tree.

Avoid blindly adding:

```text
"use client"
```

everywhere.

---

## 11. Domain Logic Must Be Framework-Independent

Do not bury Bid Ladder business rules inside React components or route files.

Target a conceptual structure such as:

```text
src/
├── domain/
│   ├── ranking/
│   ├── allocations/
│   ├── credits/
│   ├── points/
│   ├── referrals/
│   └── listings/
│
├── server/
│   ├── supabase/
│   ├── stripe/
│   └── services/
│
└── components/
```

The domain layer expresses business rules.

Next.js handles presentation and server orchestration.

This keeps future framework changes possible without rewriting the business model.

---

## 12. Financial Architecture

Authoritative financial state:

```text
credit_ledger
payment records
rank_allocations
database transactions
```

Wallet balances may be materialized/cached for performance, but the ledger remains the source of truth.

Invariant:

```text
total funded Credits
=
available Credits + active allocations
```

Allocation mutations must be atomic:

```text
lock wallet
lock allocation
calculate delta
verify available Credits
update allocation
write ledger entry
commit
```

Never accept an arbitrary balance sent by the client.

---

## 13. Stripe Architecture

Correct future flow:

```text
Browser
  ↓
request top-up
  ↓
Next.js server
  ↓
Stripe Checkout
  ↓
Stripe webhook
  ↓
verify signature
  ↓
idempotency check
  ↓
Supabase transaction
  ↓
payment record
  ↓
credit ledger
```

Never grant Credits because a user reaches a success page.

Maintain:

```text
$5 minimum top-up
$5,000/user/day top-up cap
no lifetime top-up ceiling
```

Use integer cents.

---

## 14. Points Architecture

New listing owners start at:

```text
0 Points
```

V1 sources:

```text
referral join → small reward
successful qualifying referral/top-up → larger reward
listing share → small reward
maximum 5 rewarded shares/day
```

No Points for:

```text
views
browsing
likes
comments
daily login
buying Credits
listing ownership
```

Use `points_ledger` as the source of truth.

Initial conversion target:

```text
10,000 Points → $10 Credits
```

Points must never directly affect ranking.

---

## 15. Referral Architecture

Reward meaningful economic activity, not unlimited signups.

```text
referrer
 ↓
referred user
 ↓
qualifying activity
 ↓
qualifying top-up
 ↓
Points reward
```

Prevent:

- self-referrals
- duplicate rewards
- replayed reward events
- obvious farming patterns

Make reward rules configurable.

---

## 16. Sharing

Sharing is a growth/engagement mechanism, not a ranking input.

```text
share
 ↓
record event
 ↓
check daily reward cap
 ↓
award Points if eligible
```

Initial cap:

```text
5 rewarded shares/user/day
```

Keep analytics separate from ranking.

---

## 17. Ranking

Ranking remains intentionally simple:

```text
active allocation DESC
allocation time ASC for equal amounts
```

Do not use:

```text
views
shares
freshness
Points
engagement score
AI score
quality score
```

The listing UI should expose:

```text
current rank
current allocation
listing immediately above
amount needed to overtake
resulting rank
```

---

## 18. Daily

Daily is strategically important.

Use immutable historical records.

Conceptually:

```text
daily_rankings
--------------
date
listing_id
rank
allocation_cents
captured_at
```

At UTC rollover:

```text
live Daily state
      ↓
immutable snapshot
```

Past Daily pages should remain accessible.

Examples:

```text
/daily/2026-09-14
/daily/2026-09-13
```

This supports:

- historical proof
- achievements
- SEO
- recurring competition
- shareable wins

---

## 19. Categories

Start with the proven Outbid-style taxonomy.

Do not casually invent categories during migration.

Categories are database entities and support:

```text
category
├── All-time
├── Today
└── Daily
```

Future taxonomy changes must be deliberate and backward-compatible.

---

## 20. SEO / Discovery

The Next.js version should improve the public discovery surface.

Important public pages should eventually have:

- unique title
- description
- canonical URL
- Open Graph metadata
- social metadata
- structured content where appropriate
- sitemap inclusion where appropriate
- sensible indexability
- clean URLs

Potential surfaces:

```text
category pages
listing pages
Daily archive pages
Today
trending
future news
```

Do not create thin/duplicate pages merely for SEO.

---

## 21. Performance

After migration evaluate:

- server rendering
- caching
- database query efficiency
- pagination
- image optimization
- bundle size
- client JavaScript
- public page performance
- leaderboard query performance

Do not prematurely optimize V1.

Use real production data to identify bottlenecks.

---

## 22. Security Hardening

The Next.js version should receive a serious security audit.

Review:

```text
authentication
authorization
Supabase RLS
server-side mutations
Stripe webhook security
rate limiting
abuse prevention
referral abuse
share reward abuse
daily top-up enforcement
input validation
URL canonicalization
admin permissions
audit logging
```

Never trust client-supplied:

```text
price
rank
allocation
wallet balance
Points balance
reward eligibility
category ownership
payment status
```

---

## 23. Migration Process

Do not perform a giant one-shot rewrite.

### Phase A — Audit

Document:

```text
routes
components
Supabase schema
auth
functions
ranking
events
admin
environment variables
dependencies
```

### Phase B — Domain extraction

Separate business rules from Vite/UI concerns.

### Phase C — Next.js shell

Configure:

```text
TypeScript
Supabase
environment variables
styling
authentication
error handling
logging
```

### Phase D — Public pages

Migrate:

```text
homepage
categories
Today
Daily
listing pages
```

### Phase E — Owner application

Migrate:

```text
dashboard
listings
wallet
Points
```

### Phase F — Financial operations

Migrate/test:

```text
Stripe
webhooks
Credit ledger
allocation transactions
```

### Phase G — Ranking + Daily

Validate:

```text
rank
outbid
tie-break
Today
Daily
historical snapshots
```

### Phase H — Analytics/growth

Migrate:

```text
views
clicks
shares
referrals
notifications
rank history
```

### Phase I — Production hardening

Perform:

```text
security audit
performance audit
database query audit
observability
error handling
rate limiting
backup/recovery review
SEO audit
load testing
financial reconciliation tests
```

---

## 24. One Source of Truth During Migration

Do not allow two independent applications to implement different financial/ranking logic.

Bad:

```text
Vite → ranking implementation A
Next.js → ranking implementation B
```

Preferred:

```text
Vite ─────┐
          ├──→ same Supabase/domain rules
Next.js ──┘
```

During any transition, financial and ranking mutations must have one authoritative implementation.

---

## 25. Migration Acceptance Criteria

### Public

- Homepage works.
- Category pages work.
- Listing pages work.
- Today works.
- Daily works.
- Historical Daily pages work.
- SEO metadata is correct.
- Social previews work.

### Auth

- Signup/login works.
- Server-side sessions work.
- Protected pages are protected.
- Ownership checks work.

### Credits

- Top-up works.
- $5 minimum is enforced.
- $5,000/day cap is enforced.
- Duplicate webhook does not duplicate Credits.
- Ledger reconciles.
- Allocation changes reconcile.

### Ranking

- Higher allocation ranks higher.
- Equal allocation tie-break is deterministic.
- Outbid behavior works.
- Concurrent allocation attempts cannot corrupt balances.
- Reducing allocation releases Credits correctly.

### Points

- Referral rewards are idempotent.
- Share rewards are capped.
- Duplicate rewards are prevented.
- Points conversion is correct.
- Points never affect rank.

### Security

- RLS verified.
- Server authorization verified.
- Stripe webhook verified.
- Admin permissions verified.
- Financial mutations cannot be forged from the client.

### Performance

- Public pages render efficiently.
- No unnecessary client JavaScript.
- Leaderboard queries are indexed/paginated appropriately.
- Errors are observable.

---

## 26. What "Production Hardened" Means

The future Next.js version is not simply:

> "The same app in Next.js."

It should be:

```text
Next.js
+
clean domain architecture
+
Supabase
+
transaction-safe financial system
+
secure Stripe integration
+
immutable ledgers
+
deterministic ranking
+
SEO-ready public discovery
+
observability
+
rate limiting / abuse protection
+
tested migrations
+
reliable Daily snapshots
```

The framework is only one part of the upgrade.

---

## 27. Long-Term Product Architecture

```text
                       BID LADDER
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      DISCOVERY          RANKING         ECONOMY
          │                │                │
       Categories       All-time         Credits
       Products         Today            Points
       AI News          Daily            Referrals
       Trending         Activity         Rewards
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                       OWNERS
                           │
                           ▼
                    MORE COMPETITION
                           │
                           ▼
                    MORE VISIBILITY
```

The long-term product can evolve from a simple paid leaderboard into a:

**product discovery + competitive attention + game economy platform**

But the core remains:

> **Active Credits allocated to a listing determine its rank.**

---

## 28. Final Instruction to Future Cursor Agents

When the migration eventually begins:

1. Read this document first.
2. Inspect the actual current repository.
3. Do not assume the current architecture.
4. Produce an audit before making large changes.
5. Preserve validated product behavior.
6. Separate framework migration from product redesign.
7. Preserve Supabase unless there is a compelling reason not to.
8. Preserve financial ledgers and transaction safety.
9. Preserve the simple ranking model.
10. Preserve All-time, Today, Daily, and categories.
11. Preserve the Points/Credits separation.
12. Reuse good Loveable UI rather than rewriting it unnecessarily.
13. Move business logic out of UI components.
14. Make public pages SEO-friendly.
15. Make server-side mutations authoritative.
16. Test financial and concurrency behavior before production.
17. Do not introduce complexity merely because Next.js makes it possible.
18. If a migration decision could change product behavior, document the decision before implementing it.

## North Star

**Vite MVP exists to prove the product.**

**Next.js exists to make the proven product scalable, secure, maintainable, discoverable, and production-grade.**

Do not confuse the two jobs.
