import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Eye, Share2 } from "lucide-react";

import { MovementBadge } from "@/components/MovementBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { amIAdmin } from "@/lib/admin.functions";
import { getMyListings } from "@/lib/listings.functions";
import { RANKING } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type MyListing = Awaited<ReturnType<typeof getMyListings>>[number];

function freshnessDaysLeft(approvedAt: string | null, createdAt: string | null) {
  const start = approvedAt ?? createdAt;
  if (!start) return null;
  const days = (Date.now() - new Date(start).getTime()) / 86_400_000;
  return Math.max(0, Math.round(RANKING.freshnessWindowDays - days));
}

/** Honest climb coaching: real observed counts and the documented levers only. */
function ClimbPanel({ listing }: { listing: MyListing }) {
  const ranking = listing.rankings ?? null;
  const rank: number | null = ranking?.rank ?? null;
  const previousRank: number | null = ranking?.previous_rank ?? null;
  const daysLeft = freshnessDaysLeft(listing.approved_at ?? null, listing.created_at ?? null);

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {rank == null ? (
          <span className="text-sm text-muted-foreground">Rank pending next recompute</span>
        ) : (
          <>
            <span className="rank-number text-base font-semibold text-primary">#{rank}</span>
            <MovementBadge rank={rank} previousRank={previousRank} />
          </>
        )}
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Eye className="size-3.5" />
          Unique views (×{RANKING.viewWeight}):{" "}
          {ranking ? (
            <span className="text-foreground">{ranking.unique_views}</span>
          ) : (
            "not yet measured"
          )}
        </li>
        <li className="flex items-center gap-1.5">
          <Share2 className="size-3.5" />
          Completed shares (×{RANKING.shareWeight}):{" "}
          {ranking ? <span className="text-foreground">{ranking.shares}</span> : "not yet measured"}
        </li>
        <li className="flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          Freshness (×{RANKING.freshnessWeight} per day left):{" "}
          {daysLeft == null ? (
            "unknown"
          ) : (
            <span className="text-foreground">
              {daysLeft} of {RANKING.freshnessWindowDays} days left
            </span>
          )}
        </li>
      </ul>

      <p className="mt-2 text-[11px] text-muted-foreground">
        Those are the only levers. There is nothing to buy or boost.{" "}
        <Link to="/how-ranking-works" className="text-primary underline-offset-2 hover:underline">
          How ranking works
        </Link>
      </p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My listings — Bid Ladder" },
      { name: "description", content: "Track the status and review outcome of your listings." },
      { property: "og:title", content: "My listings — Bid Ladder" },
      { property: "og:description", content: "Track your submissions on Bid Ladder." },
    ],
  }),
  component: DashboardPage,
});

const statusStyles: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  approved: "bg-rise/15 text-rise",
  rejected: "bg-fall/15 text-fall",
};

function DashboardPage() {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => getMyListings(),
  });
  const { data: admin } = useQuery({ queryKey: ["am-i-admin"], queryFn: () => amIAdmin() });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">My listings</h1>
          <div className="flex gap-2">
            {admin?.isAdmin ? (
              <Button asChild variant="secondary" size="sm">
                <Link to="/admin">Review queue</Link>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link to="/submit">New listing</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              You haven't submitted anything yet.
            </div>
          ) : (
            listings.map((listing: MyListing) => (
              <article key={listing.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{listing.name}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      statusStyles[listing.status] ?? statusStyles["pending"],
                    )}
                  >
                    {listing.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {listing.categories?.name}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{listing.tagline}</p>
                {listing.status === "rejected" && listing.rejection_reason ? (
                  <p className="mt-2 text-sm text-fall">Reason: {listing.rejection_reason}</p>
                ) : null}
                {listing.status === "approved" ? (
                  <>
                    <Link
                      to="/l/$slug"
                      params={{ slug: listing.slug }}
                      className="mt-2 inline-block text-sm text-primary"
                    >
                      View on the board
                    </Link>
                    <ClimbPanel listing={listing} />
                  </>
                ) : null}
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
