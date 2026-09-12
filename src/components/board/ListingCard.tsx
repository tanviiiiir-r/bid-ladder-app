import { Link } from "@tanstack/react-router";
import { ExternalLink, Eye, Share2 } from "lucide-react";

import { MovementBadge } from "@/components/MovementBadge";
import type { BoardListing } from "@/lib/board.functions";

export function ListingCard({ listing }: { listing: BoardListing }) {
  return (
    <article className="group relative flex gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 sm:gap-4 sm:p-5">
      <div className="flex w-10 flex-col items-center gap-1 pt-0.5 sm:w-12">
        <span className="rank-number text-lg font-semibold text-primary sm:text-xl">
          {listing.rank ?? "—"}
        </span>
        <MovementBadge rank={listing.rank} previousRank={listing.previousRank} />
      </div>

      <div className="min-w-0 flex-1">
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

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" />
            {listing.uniqueViews} unique views
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 className="size-3.5" />
            {listing.shares} shares
          </span>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground/80 hover:text-primary"
          >
            Visit
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
