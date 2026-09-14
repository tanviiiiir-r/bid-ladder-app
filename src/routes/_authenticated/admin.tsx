import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminGrantCredits,
  adminGrantPoints,
  adminSetAllocation,
  getAuditLog,
  getReviewQueue,
  recomputeRankings,
  reviewListing,
} from "@/lib/admin.functions";
import { formatCents, formatPoints } from "@/lib/format";
import { RANKING } from "@/lib/ranking";
import { cn } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dollar string → cents, or null when it isn't a clean amount. */
function parseDollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

function CreditTools() {
  const queryClient = useQueryClient();
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [pointUserId, setPointUserId] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [allocListingId, setAllocListingId] = useState("");
  const [allocAmount, setAllocAmount] = useState("");

  const grant = useMutation({
    mutationFn: (input: { userId: string; cents: number; reason?: string }) =>
      adminGrantCredits({ data: input }),
    onSuccess: (_result, input) => {
      toast.success(`Granted ${formatCents(input.cents)}`);
      setGrantAmount("");
      setGrantReason("");
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      queryClient.invalidateQueries({ queryKey: ["my-wallet"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const grantPoints = useMutation({
    mutationFn: (input: { userId: string; points: number; reason?: string }) =>
      adminGrantPoints({ data: input }),
    onSuccess: (_result, input) => {
      toast.success(`Granted ${formatPoints(input.points)}`);
      setPointAmount("");
      setPointReason("");
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      queryClient.invalidateQueries({ queryKey: ["my-wallet"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const allocate = useMutation({
    mutationFn: (input: { listingId: string; newCents: number }) =>
      adminSetAllocation({ data: input }),
    onSuccess: (_result, input) => {
      toast.success(
        input.newCents === 0
          ? "Allocation released — listing left the board"
          : `Allocation set to ${formatCents(input.newCents)}`,
      );
      setAllocAmount("");
      queryClient.invalidateQueries({ queryKey: ["board"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submitGrant() {
    if (!UUID_RE.test(grantUserId.trim())) {
      toast.error("Enter a valid user id (uuid)");
      return;
    }
    const cents = parseDollarsToCents(grantAmount);
    if (cents == null || cents <= 0 || cents % RANKING.incrementCents !== 0) {
      toast.error(`Amount must be a positive multiple of ${formatCents(RANKING.incrementCents)}`);
      return;
    }
    const reason = grantReason.trim();
    grant.mutate({ userId: grantUserId.trim(), cents, ...(reason ? { reason } : {}) });
  }

  function submitGrantPoints() {
    if (!UUID_RE.test(pointUserId.trim())) {
      toast.error("Enter a valid user id (uuid)");
      return;
    }
    const points = Number(pointAmount.trim());
    if (!Number.isInteger(points) || points <= 0) {
      toast.error("Points must be a positive whole number");
      return;
    }
    const reason = pointReason.trim();
    grantPoints.mutate({ userId: pointUserId.trim(), points, ...(reason ? { reason } : {}) });
  }

  function submitAllocation() {
    if (!UUID_RE.test(allocListingId.trim())) {
      toast.error("Enter a valid listing id (uuid)");
      return;
    }
    const cents = parseDollarsToCents(allocAmount);
    if (cents == null) {
      toast.error("Enter an amount in dollars");
      return;
    }
    if (cents !== 0) {
      if (cents % RANKING.incrementCents !== 0) {
        toast.error(`Use steps of ${formatCents(RANKING.incrementCents)}`);
        return;
      }
      if (cents < RANKING.minVisibleCents) {
        toast.error(
          `Use 0 to leave the board, or at least ${formatCents(RANKING.minVisibleCents)}`,
        );
        return;
      }
    }
    allocate.mutate({ listingId: allocListingId.trim(), newCents: cents });
  }

  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-semibold">Grant credits</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Positive multiples of {formatCents(RANKING.incrementCents)}. Logged to the credit ledger.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Input
            placeholder="User id (uuid)"
            value={grantUserId}
            onChange={(event) => setGrantUserId(event.target.value)}
          />
          <Input
            placeholder="Amount in dollars, e.g. 25"
            inputMode="decimal"
            value={grantAmount}
            onChange={(event) => setGrantAmount(event.target.value)}
          />
          <Input
            placeholder="Reason (optional)"
            value={grantReason}
            onChange={(event) => setGrantReason(event.target.value)}
          />
          <Button size="sm" onClick={submitGrant} disabled={grant.isPending}>
            {grant.isPending ? "Granting…" : "Grant credits"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-semibold">Grant points</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Whole points. 1 point converts to 1 cent of credits.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Input
            placeholder="User id (uuid)"
            value={pointUserId}
            onChange={(event) => setPointUserId(event.target.value)}
          />
          <Input
            placeholder="Points, e.g. 1000"
            inputMode="numeric"
            value={pointAmount}
            onChange={(event) => setPointAmount(event.target.value)}
          />
          <Input
            placeholder="Reason (optional)"
            value={pointReason}
            onChange={(event) => setPointReason(event.target.value)}
          />
          <Button size="sm" onClick={submitGrantPoints} disabled={grantPoints.isPending}>
            {grantPoints.isPending ? "Granting…" : "Grant points"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-semibold">Set allocation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          0 leaves the board. Otherwise at least {formatCents(RANKING.minVisibleCents)} in{" "}
          {formatCents(RANKING.incrementCents)} steps.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Input
            placeholder="Listing id (uuid)"
            value={allocListingId}
            onChange={(event) => setAllocListingId(event.target.value)}
          />
          <Input
            placeholder="New amount in dollars, e.g. 40"
            inputMode="decimal"
            value={allocAmount}
            onChange={(event) => setAllocAmount(event.target.value)}
          />
          <Button size="sm" onClick={submitAllocation} disabled={allocate.isPending}>
            {allocate.isPending ? "Saving…" : "Set allocation"}
          </Button>
        </div>
      </div>
    </section>
  );
}

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

        <CreditTools />

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
                      onClick={() => review.mutate({ listingId: listing.id, action: "approve" })}
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
