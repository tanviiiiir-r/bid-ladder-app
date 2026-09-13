import { Link } from "@tanstack/react-router";
import { ExternalLink, Eye, Share2 } from "lucide-react";

import { MovementBadge } from "@/components/MovementBadge";
import type { BoardListing } from "@/lib/board.functions";
import { formatCents } from "@/lib/format";

export function ListingCard({ listing }: { listing: BoardListing }) {
  const isFirst = listing.rank === 1;
  const overtakeCents = listing.costToOvertakeCents;

  return (
    <article className="group relative flex gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 sm:gap-4 sm:p-5">
      <div className="flex w-10 flex-col items-center gap-1 pt-0.5 sm:w-12">
        <span className="rank-number text-lg font-semibold text-primary sm:text-xl">
          {listing.rank ?? "—"}
        </span>
        <MovementBadge rank={listing.rank} previousRank={listing.previousRank} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/l/$slug"
                params={{ slug: listing.slug }}
                className="font-display text-base font-semibold text-foreground hover:text-primary sm:text-lg"
              >
                {listing.name}
              </Link>
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {listing.categoryName}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{listing.tagline}</p>
          </div>

          <div className="shrink-0 text-right">
            <div className="rank-number text-xl font-bold leading-none text-foreground sm:text-2xl">
              {formatCents(listing.allocationCents)}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              allocated
            </div>
          </div>
        </div>

        {isFirst ? (
          <p className="mt-3 text-xs font-medium text-primary">Holding #1</p>
        ) : overtakeCents > 0 ? (
          <p className="mt-3 text-xs font-medium text-primary">
            Take this rank for {formatCents(overtakeCents)} more
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
          <span
            className="inline-flex items-center gap-1"
            title="Watch-only — does not affect rank"
          >
            <Eye className="size-3" />
            {listing.uniqueViews}
          </span>
          <span
            className="inline-flex items-center gap-1"
            title="Watch-only — does not affect rank"
          >
            <Share2 className="size-3" />
            {listing.shares}
          </span>
          <span className="text-muted-foreground/60">watch-only</span>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-foreground/80 hover:text-primary"
          >
            Visit
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
