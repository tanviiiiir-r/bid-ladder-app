import { Link } from "@tanstack/react-router";
import { ExternalLink, Eye, Share2 } from "lucide-react";

import { MovementBadge } from "@/components/MovementBadge";
import type { BoardListing } from "@/lib/board.functions";
import { formatCents } from "@/lib/format";

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h`;
  return "new";
}

export function ListingCard({ listing }: { listing: BoardListing }) {
  const isFirst = listing.rank === 1;
  const overtakeCents = listing.costToOvertakeCents;
  const host = hostname(listing.url);
  const age = timeAgo(listing.approvedAt);

  return (
    <article className="group relative flex gap-3 rounded-xl border border-border bg-card p-[var(--board-row-pad)] shadow-[var(--shadow-card)] transition-colors hover:border-primary/40">
      <div className="flex w-8 shrink-0 flex-col items-center gap-1 sm:w-10">
        <span className="rank-number text-lg font-semibold leading-none text-primary sm:text-xl">
          {listing.rank ?? "—"}
        </span>
        <MovementBadge rank={listing.rank} previousRank={listing.previousRank} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                to="/l/$slug"
                params={{ slug: listing.slug }}
                className="truncate font-display text-sm font-semibold text-foreground hover:text-primary sm:text-base"
              >
                {listing.name}
              </Link>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {listing.categoryName}
              </span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:text-sm">
              {listing.tagline}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <div className="allocation-price text-2xl leading-none sm:text-3xl">
              {formatCents(listing.allocationCents)}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              allocated
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/70">
          <span className="font-medium text-primary">
            {isFirst
              ? "Holding #1"
              : overtakeCents > 0
                ? `Take this rank for ${formatCents(overtakeCents)} more`
                : ""}
          </span>
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
          {age ? <span className="text-muted-foreground/60">{age}</span> : null}
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground/80 hover:text-primary"
          >
            {host ?? "Visit"}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </article>
  );
}
