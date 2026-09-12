import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { amIAdmin } from "@/lib/admin.functions";
import { getMyListings } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

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
            listings.map((listing: any) => (
              <article key={listing.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{listing.name}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                      statusStyles[listing.status] ?? statusStyles.pending,
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
                  <Link
                    to="/l/$slug"
                    params={{ slug: listing.slug }}
                    className="mt-2 inline-block text-sm text-primary"
                  >
                    View on the board
                  </Link>
                ) : null}
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
