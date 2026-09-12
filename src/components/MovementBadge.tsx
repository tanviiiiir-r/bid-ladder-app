import { ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";

import { getMovement } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Props = {
  rank: number | null;
  previousRank: number | null;
  className?: string;
};

const neutral =
  "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground";

/**
 * Movement vs the previous ranking recompute. Real persisted ranks only,
 * with hysteresis so single-position noise outside the top 10 reads as Flat.
 */
export function MovementBadge({ rank, previousRank, className }: Props) {
  const movement = getMovement(rank, previousRank);

  if (movement.kind === "none") return null;

  if (movement.kind === "new") {
    return (
      <span className={cn(neutral, className)}>
        <Sparkles className="size-3" />
        New
      </span>
    );
  }

  if (movement.kind === "flat") {
    return (
      <span className={cn(neutral, className)}>
        <Minus className="size-3" />
        Flat
      </span>
    );
  }

  const up = movement.kind === "up";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-rise/15 text-rise" : "bg-fall/15 text-fall",
        className,
      )}
      title={
        up
          ? `Up ${movement.delta} since the previous recompute`
          : `Down ${movement.delta} since the previous recompute`
      }
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {movement.delta}
    </span>
  );
}
