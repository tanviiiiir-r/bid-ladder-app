import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Coins, Crown, Minus, Plus, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { centsToDollarInput, formatCents } from "@/lib/format";
import { RANKING, costToClaimFirstCents, previewRankForAmount } from "@/lib/ranking";

export function ClaimRankControl({
  listings,
  archived = false,
}: {
  listings: Array<{ allocationCents: number }>;
  archived?: boolean;
}) {
  const defaultCents = costToClaimFirstCents(listings[0]?.allocationCents ?? null, false);
  const [draftCents, setDraftCents] = useState(defaultCents);
  const [dollarInput, setDollarInput] = useState(centsToDollarInput(defaultCents));

  useEffect(() => {
    setDraftCents(defaultCents);
    setDollarInput(centsToDollarInput(defaultCents));
  }, [defaultCents]);

  const previewRank = previewRankForAmount(listings, draftCents);
  const buySearch = { cents: draftCents } as const;

  function applyCents(next: number) {
    const clamped = Math.max(RANKING.minVisibleCents, next);
    const snapped = Math.round(clamped / RANKING.incrementCents) * RANKING.incrementCents;
    setDraftCents(snapped);
    setDollarInput(centsToDollarInput(snapped));
  }

  function commitInput() {
    const parsed = Number(dollarInput);
    if (!Number.isFinite(parsed)) {
      setDollarInput(centsToDollarInput(draftCents));
      return;
    }
    applyCents(Math.round(parsed * 100));
  }

  return (
    <div className="mt-1 rounded-2xl border border-primary/30 bg-surface/70 p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Crown className="size-3.5 text-primary" />
            {previewRank == null ? "Below the board" : `Claim #${previewRank}`}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={`Decrease by ${formatCents(RANKING.incrementCents)}`}
              disabled={archived || draftCents <= RANKING.minVisibleCents}
              onClick={() => applyCents(draftCents - RANKING.incrementCents)}
            >
              <Minus className="size-4" />
            </Button>
            <div className="flex items-baseline gap-0.5">
              <span className="allocation-price text-3xl leading-none text-muted-foreground sm:text-4xl">
                $
              </span>
              <input
                className="allocation-price min-w-[3ch] bg-transparent text-5xl leading-none outline-none sm:text-6xl"
                style={{ width: `${Math.max(2, dollarInput.length + 1)}ch` }}
                inputMode="numeric"
                aria-label="Amount in dollars"
                disabled={archived}
                value={dollarInput}
                onChange={(event) => setDollarInput(event.target.value.replace(/[^\d]/g, ""))}
                onBlur={commitInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitInput();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={`Increase by ${formatCents(RANKING.incrementCents)}`}
              disabled={archived}
              onClick={() => applyCents(draftCents + RANKING.incrementCents)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {archived
              ? "This Daily board is archived. Switch to today to claim a rank."
              : previewRank == null
                ? `Allocate at least ${formatCents(RANKING.minVisibleCents)} to appear.`
                : `Your amount decides the rank. Paying less than #1 still lands at #${previewRank}.`}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="w-full shrink-0 sm:w-auto" disabled={archived}>
              <Crown className="size-4" />
              {previewRank == null
                ? `Claim rank for ${formatCents(draftCents)}`
                : `Claim #${previewRank} for ${formatCents(draftCents)}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Pay with</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/credits/buy" search={{ ...buySearch, method: "credits" }}>
                <Wallet className="size-4" />
                <span className="flex flex-col">
                  <span>Buy with credits</span>
                  <span className="text-[11px] text-muted-foreground">
                    Top up {formatCents(draftCents)} then allocate
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/credits/buy" search={{ ...buySearch, method: "points" }}>
                <Coins className="size-4" />
                <span className="flex flex-col">
                  <span>Buy with points</span>
                  <span className="text-[11px] text-muted-foreground">
                    {draftCents.toLocaleString("en-US")} pts, leftover via card
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
