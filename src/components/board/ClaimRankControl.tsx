import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Coins, Wallet } from "lucide-react";

import { AmountStepper, snapAllocationCents } from "@/components/board/AmountStepper";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/format";
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
  useEffect(() => {
    setDraftCents(defaultCents);
  }, [defaultCents]);
  const previewCents = snapAllocationCents(draftCents);
  const previewRank = previewRankForAmount(listings, previewCents);
  const buySearch = { cents: previewCents } as const;

  return (
    <div className="surface-card p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {previewRank == null ? "Below the board" : `Claim #${previewRank}`}
          </span>
          <div className="mt-4">
            <AmountStepper
              valueCents={draftCents}
              onChange={setDraftCents}
              disabled={archived}
            />
          </div>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            {archived
              ? "This Daily board is archived. Switch to today to claim a rank."
              : previewRank == null
                ? `Allocate at least ${formatCents(RANKING.minVisibleCents)} to appear.`
                : `Type a dollar amount or use +/−. Paying less than #1 still lands at #${previewRank}.`}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-xs">
          <Button size="lg" className="w-full" disabled={archived} asChild>
            <Link to="/credits/buy" search={{ ...buySearch, method: "credits" }}>
              <Wallet className="size-4" />
              {previewRank == null
                ? `Buy credits · ${formatCents(previewCents)}`
                : `Buy credits · Claim #${previewRank}`}
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full" disabled={archived} asChild>
            <Link to="/credits/buy" search={{ ...buySearch, method: "points" }}>
              <Coins className="size-4" />
              Buy with points
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
