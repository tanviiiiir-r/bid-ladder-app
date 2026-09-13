import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAuditLog,
  getReviewQueue,
  recomputeRankings,
  reviewListing,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Review queue — Bid Ladder" },
      { name: "description", content: "Approve or reject submitted listings." },
      { property: "og:title", content: "Review queue — Bid Ladder" },
      { property: "og:description", content: "Admin review queue for Bid Ladder submissions." },
    ],
  }),
  component: AdminPage,
});

type QueueListing = Awaited<ReturnType<typeof getReviewQueue>>[number];
type AuditEntry = Awaited<ReturnType<typeof getAuditLog>>[number];

const statusStyles: Record<string, string> = {
  pending: "bg-primary/15 text-primary",
  approved: "bg-rise/15 text-rise",
  rejected: "bg-fall/15 text-fall",
};

function AdminPage() {
  const queryClient = useQueryClient();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const queue = useQuery({ queryKey: ["review-queue"], queryFn: () => getReviewQueue() });
  const audit = useQuery({ queryKey: ["audit-log"], queryFn: () => getAuditLog() });

  const review = useMutation({
    mutationFn: (input: { listingId: string; action: "approve" | "reject"; reason?: string }) =>
      reviewListing({ data: input }),
    onSuccess: () => {
      toast.success("Decision saved");
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recompute = useMutation({
    mutationFn: () => recomputeRankings(),
    onSuccess: () => {
      toast.success("Rankings recomputed");
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (queue.isError) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-display text-xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account doesn't have review access.
          </p>
        </main>
      </div>
    );
  }

  const listings: QueueListing[] = queue.data ?? [];
  const pending = listings.filter((listing) => listing.status === "pending");
  const decided = listings.filter((listing) => listing.status !== "pending");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Review queue</h1>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
          >
            Recompute rankings
          </Button>
        </div>

        <h2 className="mt-8 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Pending ({pending.length})
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing waiting for review.
            </p>
          ) : (
            pending.map((listing) => (
              <article key={listing.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold">{listing.name}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {listing.categories?.name}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{listing.tagline}</p>
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-all text-xs text-primary"
                >
                  {listing.url}
                </a>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {listing.description}
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Reason (required to reject)"
                    value={reasons[listing.id] ?? ""}
                    onChange={(event) =>
                      setReasons({ ...reasons, [listing.id]: event.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({ listingId: listing.id, action: "approve" })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({
                          listingId: listing.id,
                          action: "reject",
                          ...(reasons[listing.id]?.trim()
                            ? { reason: reasons[listing.id]!.trim() }
                            : {}),
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <h2 className="mt-10 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Recently decided
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {decided.slice(0, 10).map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <span className="font-medium">{listing.name}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                  statusStyles[listing.status],
                )}
              >
                {listing.status}
              </span>
              {listing.rejection_reason ? (
                <span className="text-xs text-muted-foreground">{listing.rejection_reason}</span>
              ) : null}
            </div>
          ))}
        </div>

        <h2 className="mt-10 font-display text-sm uppercase tracking-wide text-muted-foreground">
          Audit log
        </h2>
        <div className="mt-3 flex flex-col gap-1.5">
          {(audit.data ?? []).map((entry: AuditEntry) => (
            <div key={entry.id} className="text-xs text-muted-foreground">
              <span className="rank-number">{new Date(entry.created_at).toLocaleString()}</span> ·{" "}
              <span className="capitalize text-foreground">{entry.action}</span>
              {entry.reason ? ` · ${entry.reason}` : ""}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
