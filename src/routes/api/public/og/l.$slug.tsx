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
export const Route = createFileRoute("/api/public/og/l/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { createPublicSupabase } = await import("@/lib/supabase-public.server");
        const supabase = createPublicSupabase();

        const { data: row, error } = await supabase
          .from("listings")
          .select("name, tagline, rankings(rank, previous_rank, unique_views, shares, computed_at)")
          .eq("status", "approved")
          .eq("slug", params.slug)
          .maybeSingle();

        if (error || !row) {
          return new Response("Not found", { status: 404 });
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
          (
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
                  {`${uniqueViews} unique views \u00b7 ${shares} shares`}
                </div>
              </div>

              <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>
                Real attention only · money never buys organic position
              </div>
            </div>
          ),
          {
            width: 1200,
            height: 630,
            headers: {
              // Short TTL + versioned URL: never serve a rank claim the DB has moved past.
              "cache-control": "public, max-age=60, s-maxage=300",
            },
          },
        );
      },
    },
  },
});
