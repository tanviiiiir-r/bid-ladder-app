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

  const typedDollars = Number(dollarInput);
  const liveCents =
    Number.isInteger(typedDollars) && typedDollars > 0 ? typedDollars * 100 : draftCents;
  const previewRank = previewRankForAmount(listings, liveCents);
  const buySearch = { cents: liveCents } as const;

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
    <div className="flex flex-col items-center text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <h2 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-6xl">
          {previewRank == null ? "Claim a rank for" : `Claim #${previewRank} for`}
        </h2>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="rounded-full"
            aria-label={`Decrease by ${formatCents(RANKING.incrementCents)}`}
            disabled={archived || draftCents <= RANKING.minVisibleCents}
            onClick={() => applyCents(draftCents - RANKING.incrementCents)}
          >
            <Minus className="size-4" />
          </Button>
          <div className="flex items-baseline">
            <span className="allocation-price text-4xl leading-none sm:text-6xl">$</span>
            <input
              className="allocation-price min-w-[2ch] bg-transparent text-4xl leading-none outline-none sm:text-6xl"
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
            className="rounded-full"
            aria-label={`Increase by ${formatCents(RANKING.incrementCents)}`}
            disabled={archived}
            onClick={() => applyCents(draftCents + RANKING.incrementCents)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5 flex w-full max-w-2xl flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="w-full rounded-full sm:w-auto" disabled={archived}>
              <Crown className="size-4" />
              {previewRank == null
                ? `Claim rank for ${formatCents(liveCents)}`
                : `Claim #${previewRank} for ${formatCents(liveCents)}`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-64">
            <DropdownMenuLabel>Pay with</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/credits/buy" search={{ ...buySearch, method: "credits" }}>
                <Wallet className="size-4" />
                <span className="flex flex-col">
                  <span>Buy with credits</span>
                  <span className="text-[11px] text-muted-foreground">
                    Top up {formatCents(liveCents)} then allocate
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
                    {liveCents.toLocaleString("en-US")} pts, leftover via card
                  </span>
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button asChild variant="secondary" size="lg" className="w-full rounded-full sm:w-auto">
          <Link to="/submit">Submit your product</Link>
        </Button>
      </div>

      <p className="mt-3 max-w-xl text-xs text-muted-foreground">
        {archived
          ? "This Daily board is archived. Switch to today to claim a rank."
          : previewRank == null
            ? `Allocate at least ${formatCents(RANKING.minVisibleCents)} to appear.`
            : `Your amount decides the rank. Paying less than #1 still lands at #${previewRank}.`}
      </p>
    </div>
  );
}
