import { Clock } from "lucide-react";

import type { BoardListing } from "@/lib/board.functions";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/**
 * Honest freshness cue: uses only the newest real `computed_at` from persisted
 * rankings. Never invents a time, and never triggers a recompute.
 */
export function RanksFreshness({ listings }: { listings: BoardListing[] }) {
  const stamps = listings
    .map((listing) => listing.computedAt)
    .filter((value): value is string => Boolean(value));

  const latest = stamps.length
    ? stamps.reduce((a, b) => (new Date(a).getTime() > new Date(b).getTime() ? a : b))
    : null;

  return (
    <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="size-3.5" aria-hidden="true" />
      {latest ? (
        <span>
          Ranks as of <time dateTime={latest}>{relativeTime(latest)}</time>
        </span>
      ) : (
        <span>Ranks pending next recompute</span>
      )}
    </p>
  );
}
