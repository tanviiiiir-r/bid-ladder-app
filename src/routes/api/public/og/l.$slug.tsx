import { createFileRoute } from "@tanstack/react-router";

import { getMovement } from "@/lib/ranking";

/**
 * Status share card for a single approved listing.
 *
 * Only observed, persisted fields are drawn: real rank, real previous_rank
 * movement, real unique_views / shares. Nothing is invented — when there is no
 * persisted rank the card says "Rank pending" instead of showing a number.
 *
 * Cache key: callers append ?v=<rank>-<computedAt> so a stale CDN copy can
 * never claim a better rank than the database currently holds. TTL stays short.
 */
/**
 * Per-IP rate limit, best available primitive on this stack.
 *
 * GAP: there is no shared/edge rate-limit store here, so this counter lives in
 * the isolate's memory. Each Worker isolate keeps its own window, so the real
 * ceiling is LIMIT x (number of live isolates), and it resets on cold start.
 * It stops single-source hammering of the image render; it is not a strict
 * global quota. Client IP comes from the platform header, which the edge sets
 * (a spoofed value only splits an attacker's own bucket, never another user's).
 */
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

export const Route = createFileRoute("/api/public/og/l/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // Anonymous GET stays open for crawlers; only volume is bounded.
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-real-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const limit = checkRateLimit(ip);
        if (!limit.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: {
              "retry-after": String(limit.retryAfter),
              "cache-control": "no-store",
            },
          });
        }

        const { createPublicSupabase } = await import("@/lib/supabase-public.server");
        const supabase = createPublicSupabase();

        const { data: row, error } = await supabase
          .from("listings")
          .select("name, tagline, rankings(rank, previous_rank, unique_views, shares, computed_at)")
          .eq("status", "approved")
          .eq("slug", params.slug)
          .maybeSingle();

        // Cheap 404: no image render for missing / non-approved listings.
        if (error || !row) {
          return new Response("Not found", {
            status: 404,
            headers: { "cache-control": "public, max-age=60" },
          });
        }

        const ranking = (
          row as unknown as {
            rankings: {
              rank: number;
              previous_rank: number | null;
              unique_views: number;
              shares: number;
              computed_at: string | null;
            } | null;
          }
        ).rankings;

        const rank = ranking?.rank ?? null;
        const previousRank = ranking?.previous_rank ?? null;
        const uniqueViews = ranking?.unique_views ?? 0;
        const shares = ranking?.shares ?? 0;
        const movement = getMovement(rank, previousRank);

        const movementLabel =
          movement.kind === "up"
            ? `\u2191${movement.delta}`
            : movement.kind === "down"
              ? `\u2193${movement.delta}`
              : movement.kind === "new"
                ? "New"
                : movement.kind === "flat"
                  ? "Flat"
                  : "";
        const movementColor =
          movement.kind === "up" ? "#34d399" : movement.kind === "down" ? "#f87171" : "#94a3b8";

        const { ImageResponse } = await import("@cf-wasm/og");

        return new ImageResponse(
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "1200px",
              height: "630px",
              padding: "64px",
              backgroundColor: "#0b1120",
              color: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 30, color: "#fbbf24", letterSpacing: 2 }}>
                BID LADDER
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#fbbf24" }}>
                  {rank == null ? "Rank pending" : `#${rank}`}
                </div>
                {movementLabel ? (
                  <div style={{ display: "flex", fontSize: 34, color: movementColor }}>
                    {movementLabel}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", fontSize: 68, fontWeight: 700 }}>{row.name}</div>
              <div style={{ display: "flex", fontSize: 34, color: "#cbd5e1" }}>{row.tagline}</div>
              <div style={{ display: "flex", fontSize: 32, color: "#94a3b8" }}>
                {`${uniqueViews} unique views \u00b7 ${shares} shares \u00b7 watch-only`}
              </div>
            </div>

            <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>
              Credits allocated to a listing determine its rank
            </div>
          </div>,
          {
            width: 1200,
            height: 630,
            headers: {
              // Short TTL + versioned URL: never serve a rank claim the DB has moved past.
              "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
            },
          },
        );
      },
    },
  },
});
