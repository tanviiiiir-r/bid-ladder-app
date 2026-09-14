# Preview seed (unpublished)

Wipeable fake users and listings so All-time / Today look like a real board **before go-live**.

- Run on a disposable preview/dev Supabase project only. Never on production.
- Do **not** publish seed listings as real traction.
- Identities: `seed+makerNN@bid-ladder.dev`. Listing names and descriptions start with `[SEED]`.
- Apply `preview_unseed.sql` before any public launch.

`preview_seed.sql` is idempotent: it wipes previous seed rows, then recreates users, listings, grants, and allocations via `admin_grant_credits` / `set_allocation`. After allocate, it lowers two Today rows and writes a closed Daily snapshot so All-time (#1 Northstar $170), Today (#1 Ledgerlift $85), and Daily (yesterday Ledgerlift $90) do not look the same.

Draftshelf stays approved at $0 — owner/admin only, hidden on public boards.
