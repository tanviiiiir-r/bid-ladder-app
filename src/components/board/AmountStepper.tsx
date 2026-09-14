import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { centsToDollarInput, formatCents } from "@/lib/format";
import { RANKING } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export function snapAllocationCents(next: number): number {
  const clamped = Math.max(RANKING.minVisibleCents, next);
  return Math.round(clamped / RANKING.incrementCents) * RANKING.incrementCents;
}

export function AmountStepper({
  valueCents,
  onChange,
  disabled = false,
  size = "lg",
}: {
  valueCents: number;
  onChange: (cents: number) => void;
  disabled?: boolean;
  size?: "lg" | "md";
}) {
  const [dollarInput, setDollarInput] = useState(centsToDollarInput(valueCents));

  useEffect(() => {
    setDollarInput(centsToDollarInput(valueCents));
  }, [valueCents]);

  function applyCents(next: number) {
    const snapped = snapAllocationCents(next);
    onChange(snapped);
    setDollarInput(centsToDollarInput(snapped));
  }

  function commitInput() {
    const parsed = Number(dollarInput);
    if (!Number.isFinite(parsed)) {
      setDollarInput(centsToDollarInput(valueCents));
      return;
    }
    applyCents(Math.round(parsed * 100));
  }

  const large = size === "lg";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={`Decrease by ${formatCents(RANKING.incrementCents)}`}
        disabled={disabled || valueCents <= RANKING.minVisibleCents}
        onClick={() => applyCents(valueCents - RANKING.incrementCents)}
      >
        <Minus className="size-4" />
      </Button>
      <label className="flex min-w-0 items-baseline gap-0.5 rounded-lg border border-border bg-background px-3 py-1.5 focus-within:border-primary">
        <span
          className={cn(
            "allocation-price leading-none text-muted-foreground",
            large ? "text-3xl sm:text-4xl" : "text-2xl",
          )}
        >
          $
        </span>
        <input
          className={cn(
            "allocation-price min-w-[3ch] bg-transparent leading-none caret-primary outline-none",
            large ? "text-5xl sm:text-6xl" : "text-3xl",
          )}
          style={{ width: `${Math.max(2, dollarInput.length + 1)}ch` }}
          inputMode="numeric"
          aria-label="Amount in dollars"
          disabled={disabled}
          value={dollarInput}
          onChange={(event) => {
            const next = event.target.value.replace(/[^\d]/g, "");
            setDollarInput(next);
            const parsed = Number(next);
            if (Number.isInteger(parsed) && parsed > 0) onChange(parsed * 100);
          }}
          onBlur={commitInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitInput();
            }
          }}
        />
      </label>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={`Increase by ${formatCents(RANKING.incrementCents)}`}
        disabled={disabled}
        onClick={() => applyCents(valueCents + RANKING.incrementCents)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
