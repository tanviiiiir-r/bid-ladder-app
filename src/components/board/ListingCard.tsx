import { Link } from "@tanstack/react-router";
import { ExternalLink, Eye, Share2 } from "lucide-react";

import { MovementBadge } from "@/components/MovementBadge";
import type { BoardListing } from "@/lib/board.functions";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h ago`;
  return "new";
}

export function ListingCard({ listing }: { listing: BoardListing }) {
  const isFirst = listing.rank === 1;
  const overtakeCents = listing.costToOvertakeCents;
  const host = hostname(listing.url);
  const age = timeAgo(listing.approvedAt);

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border p-[var(--board-row-pad)] transition-colors sm:gap-5",
        isFirst
          ? "border-primary/35 bg-primary/[0.06] shadow-[var(--shadow-card)]"
          : "border-border/70 bg-card/60 hover:border-primary/30",
      )}
    >
      <div className="flex w-9 shrink-0 flex-col items-center gap-1 pt-0.5 sm:w-12">
        <span
          className={cn(
            "rank-number text-xl font-semibold leading-none sm:text-2xl",
            isFirst ? "text-primary" : "text-muted-foreground",
          )}
        >
          #{listing.rank ?? "—"}
        </span>
        <MovementBadge rank={listing.rank} previousRank={listing.previousRank} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <Link
            to="/l/$slug"
            params={{ slug: listing.slug }}
            className="min-w-0 font-display text-base font-semibold leading-snug text-foreground hover:text-primary sm:text-lg"
          >
            {listing.name}
          </Link>

          <div className="allocation-price shrink-0 text-xl leading-none sm:text-2xl">
            {formatCents(listing.allocationCents)}
          </div>
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{listing.tagline}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground/70">
          <span className="font-semibold text-primary">{listing.categoryName}</span>
          {age ? <span aria-hidden>·</span> : null}
          {age ? <span>{age}</span> : null}
          <span aria-hidden>·</span>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground/70 hover:text-primary"
          >
            {host ?? "Visit"}
            <ExternalLink className="size-3" />
          </a>
          <span aria-hidden>·</span>
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
          <span aria-hidden>·</span>
          <span className="font-medium text-primary">
            {isFirst
              ? "Holding #1"
              : overtakeCents > 0
                ? `Take this rank for ${formatCents(overtakeCents)} more`
                : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
