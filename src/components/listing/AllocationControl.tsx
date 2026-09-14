import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setListingAllocation } from "@/lib/allocation.functions";
import { formatCents } from "@/lib/format";
import { RANKING, assertAllocationAmount } from "@/lib/ranking";

export function AllocationControl({
  listingId,
  allocationCents,
  availableCents,
}: {
  listingId: string;
  allocationCents: number;
  availableCents: number;
}) {
  const [draftCents, setDraftCents] = useState(Math.max(allocationCents, RANKING.minVisibleCents));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newCents: number) => setListingAllocation({ data: { listingId, newCents } }),
    onSuccess: async () => {
      toast.success("Allocation updated");
      await queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const delta = draftCents - allocationCents;
  const check = assertAllocationAmount(draftCents);
  const overBudget = delta > availableCents;
  const canSave = check.ok && delta !== 0 && !overBudget && !mutation.isPending;

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface/60 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Allocation</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
        variant="outline"
        size="icon"
        aria-label={`Decrease by ${formatCents(RANKING.incrementCents)}`}
          disabled={draftCents <= RANKING.minVisibleCents}
          onClick={() => setDraftCents((cents) => Math.max(0, cents - RANKING.incrementCents))}
        >
          <Minus className="size-4" />
        </Button>
        <span className="allocation-price min-w-24 text-center text-lg">
          {formatCents(draftCents)}
        </span>
        <Button
          type="button"
        variant="outline"
        size="icon"
        aria-label={`Increase by ${formatCents(RANKING.incrementCents)}`}
          onClick={() => setDraftCents((cents) => cents + RANKING.incrementCents)}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={() => mutation.mutate(draftCents)}
        >
          {mutation.isPending ? "Saving…" : "Set allocation"}
        </Button>
        {allocationCents > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(0)}
          >
            Release all
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Steps of {formatCents(RANKING.incrementCents)} · minimum{" "}
        {formatCents(RANKING.minVisibleCents)} to appear on a board.
        {delta > 0 ? ` This commits ${formatCents(delta)} more from your wallet.` : ""}
        {delta < 0 ? ` This releases ${formatCents(-delta)} back to your wallet.` : ""}
      </p>
      {!check.ok ? <p className="mt-1 text-[11px] text-fall">{check.reason}</p> : null}
      {overBudget ? (
        <p className="mt-1 text-[11px] text-fall">
          Not enough available credits — you have {formatCents(availableCents)}.
        </p>
      ) : null}
    </div>
  );
}
