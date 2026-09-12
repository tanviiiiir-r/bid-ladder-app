import { ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  rank: number | null;
  previousRank: number | null;
  className?: string;
};

/** Movement vs the previous ranking recompute. Real signals only. */
export function MovementBadge({ rank, previousRank, className }: Props) {
  if (rank == null) return null;

  if (previousRank == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Sparkles className="size-3" />
        New
      </span>
    );
  }

  const delta = previousRank - rank;

  if (delta === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <Minus className="size-3" />
        Flat
      </span>
    );
  }

  const up = delta > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-rise/15 text-rise" : "bg-fall/15 text-fall",
        className,
      )}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(delta)}
    </span>
  );
}
