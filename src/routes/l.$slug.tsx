import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ArrowLeft, ExternalLink, Eye, Share2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { MovementBadge } from "@/components/MovementBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/board.functions";
import { formatCents } from "@/lib/format";
import { boardQuery, listingQuery } from "@/lib/queries";
import { BOARDS, RANKING, type BoardKind } from "@/lib/ranking";

type ListingSearch = { board?: BoardKind; date?: string };

function parseSearch(search: Record<string, unknown>): ListingSearch {
  const rawBoard = String(search["board"] ?? "all_time");
  const board = (BOARDS as readonly string[]).includes(rawBoard)
    ? (rawBoard as BoardKind)
    : "all_time";
  const rawDate = typeof search["date"] === "string" ? search["date"] : undefined;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;
  return date ? { board, date } : { board };
}


export const Route = createFileRoute("/l/$slug")({
  validateSearch: parseSearch,
  loaderDeps: ({ search }) => ({ board: search.board, date: search.date }),
  loader: async ({ context, params, deps }) => {
    const listing = await context.queryClient.ensureQueryData(
      listingQuery(params.slug, deps.board, deps.date),
    );
    if (!listing) throw notFound();
    await context.queryClient.ensureQueryData(
      boardQuery(listing.categorySlug, deps.board, deps.date),
    );
    return { listing };
  },

  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Listing unavailable — Bid Ladder" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { listing } = loaderData;
    // Only observed facts: real persisted rank (omitted when absent) and real counts.
    const title =
      listing.rank == null
        ? `${listing.name} — on Bid Ladder (rank pending)`
        : `#${listing.rank} on Bid Ladder — ${listing.name}`;
    const description = `${listing.tagline} · Unique views & shares only. Money never buys organic position.`;
    const url = `https://rising-star-board.lovable.app/l/${params.slug}`;
    // Versioned by real rank + recompute time so a cached card can never claim
    // a rank the database has already moved past.
    const version = encodeURIComponent(
      `${listing.rank ?? "na"}-${listing.computedAt ?? "pending"}`,
    );
    const image = `https://rising-star-board.lovable.app/api/public/og/l/${params.slug}?v=${version}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ListingPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center" role="alert">
      <h1 className="font-display text-xl font-semibold">This listing couldn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="font-display text-xl font-semibold">Listing not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may still be under review — only approved listings are public.
      </p>
      <Link to="/" className="mt-6 inline-block text-sm text-primary">
        Back to the board
      </Link>
    </div>
  ),
});

function ListingPage() {
  const { slug } = Route.useParams();
  const { board, date } = Route.useSearch();
  const { data } = useSuspenseQuery(listingQuery(slug, board, date));
  const { data: peers } = useSuspenseQuery(boardQuery(data?.categorySlug ?? "all", board, date));

  const tracked = useRef(false);

  useEffect(() => {
    if (!data || tracked.current) return;
    tracked.current = true;
    void trackEvent({ data: { listingId: data.id, kind: "view" } });
  }, [data]);

  if (!data) return null;

  async function handleShare() {
    if (!data) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: data.name, text: data.tagline, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      // Only a completed share counts; a dismissed sheet must not inflate shares.
      void trackEvent({ data: { listingId: data.id, kind: "share" } });
    } catch {
      /* user dismissed the share sheet — no event recorded */
    }
  }

  const boardLabel =
    board === "today" ? "Today" : board === "daily" ? `Daily${date ? ` ${date}` : ""}` : "All-time";
  const onBoard = data.isBoardVisible && data.rank != null;
  const above = data.rank != null ? peers.find((peer) => peer.rank === data.rank! - 1) : undefined;
  const overtakeCents = data.costToOvertakeCents;
  // Rank someone lands on if they pay the overtake cost: one step above, or #1
  // when the listing being passed is already the leader.
  const resultingRank = data.rank == null ? null : Math.max(1, data.rank - 1);
  const shortfallCents = Math.max(0, RANKING.minVisibleCents - data.allocationCents);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Board
        </Link>

        <section className="board-grid-bg mt-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {data.categoryName}
              </span>
              <h1 className="mt-3 truncate text-2xl font-bold sm:text-3xl">{data.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{data.tagline}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="rank-number text-3xl font-bold text-foreground sm:text-4xl">
                {formatCents(data.allocationCents)}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                allocated
              </span>
              {onBoard ? (
                <div className="flex items-center gap-2">
                  <span className="rank-number text-lg font-semibold text-primary">
                    #{data.rank}
                  </span>
                  <MovementBadge rank={data.rank} previousRank={data.previousRank} />
                </div>
              ) : null}
            </div>
          </div>

          {onBoard ? (
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-medium text-foreground">
                Anyone can take this rank for {formatCents(overtakeCents)} on the{" "}
                {data.categoryName} board.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {boardLabel} board · paying that lands them at #{resultingRank}
                {above ? ` (currently ${above.name} at ${formatCents(above.allocationCents)})` : ""}
                .
                {data.rank === 1
                  ? ` Claiming #1 costs ${formatCents(data.costToClaimFirstCents)}.`
                  : ""}
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-medium text-foreground">
                Not on the public {boardLabel} board yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                A listing appears once its allocation reaches {formatCents(RANKING.minVisibleCents)}
                {shortfallCents > 0 ? ` — ${formatCents(shortfallCents)} to go` : ""}. Claiming #1
                on this board costs {formatCents(data.costToClaimFirstCents)}.
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-3">
                <Link to="/dashboard">
                  <TrendingUp className="size-4" />
                  Allocate credits
                </Link>
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <a href={data.url} target="_blank" rel="noopener noreferrer">
                Visit site
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button variant="secondary" onClick={handleShare}>
              <Share2 className="size-4" />
              Share
            </Button>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">About</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {data.description}
          </p>
        </section>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3" />
            {data.uniqueViews} unique views
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 className="size-3" />
            {data.shares} shares
          </span>
          <span>watch-only — these do not affect rank</span>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Credits allocated to a listing determine its rank —{" "}
          <Link to="/how-ranking-works" className="text-primary underline-offset-2 hover:underline">
            how ranking works
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
