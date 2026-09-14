import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

import { MovementBadge } from "@/components/MovementBadge";
import type { BoardListing } from "@/lib/board.functions";
import { getMovement } from "@/lib/ranking";

const CAP = 5;

/**
 * Rising / New strip. Built only from real persisted rank vs previous_rank via
 * getMovement — never synthetic velocity, never placeholder rows.
 */
export function RisingStrip({ listings }: { listings: BoardListing[] }) {
  const items = listings
    .map((listing) => ({ listing, movement: getMovement(listing.rank, listing.previousRank) }))
    .filter(
      ({ movement }) =>
        movement.kind === "new" || (movement.kind === "up" && movement.rising === true),
    )
    .slice(0, CAP);

  if (items.length === 0) return null;

  return (
    <section aria-label="Rising and new listings" className="mt-6">
      <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-[0.01em] text-muted-foreground">
        <TrendingUp className="size-3.5" />
        Rising &amp; new
      </h2>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {items.map(({ listing }) => (
          <Link
            key={listing.id}
            to="/l/$slug"
            params={{ slug: listing.slug }}
            className="flex shrink-0 items-center gap-2 rounded-md border-[0.5px] border-border bg-transparent px-3 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <span className="rank-number text-xs">
              {listing.rank ?? "—"}
            </span>
            <span className="max-w-[9rem] truncate font-medium">{listing.name}</span>
            <MovementBadge rank={listing.rank} previousRank={listing.previousRank} />
          </Link>
        ))}
      </div>
    </section>
  );
}
