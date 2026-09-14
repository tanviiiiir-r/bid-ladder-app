import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Coins, Wallet } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { convertPointsToCredits, getMyWallet } from "@/lib/allocation.functions";
import { formatCents, formatPoints } from "@/lib/format";
import { RANKING, pointsForCents } from "@/lib/ranking";
import { createStripeCheckout, getStripeStatus } from "@/lib/stripe.functions";

type BuySearch = {
  cents?: number;
  method?: "credits" | "points";
  canceled?: boolean;
};

function parseCents(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n <= 0) return undefined;
  return n;
}

export const Route = createFileRoute("/_authenticated/credits/buy")({
  validateSearch: (search: Record<string, unknown>): BuySearch => {
    const out: BuySearch = {};
    const cents = parseCents(search["cents"]);
    if (cents != null) out.cents = cents;
    if (search["method"] === "points" || search["method"] === "credits") {
      out.method = search["method"];
    }
    if (
      search["canceled"] === true ||
      search["canceled"] === "1" ||
      search["canceled"] === "true"
    ) {
      out.canceled = true;
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Buy credits — Bid Ladder" },
      {
        name: "description",
        content: "Top up credits with a card, or convert points and pay any leftover.",
      },
    ],
  }),
  component: BuyCreditsPage,
});

function BuyCreditsPage() {
  const { cents: rawCents, method = "credits", canceled } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const neededCents = useMemo(() => {
    const fallback = RANKING.minVisibleCents;
    const value = rawCents ?? fallback;
    return Math.max(
      RANKING.incrementCents,
      Math.round(value / RANKING.incrementCents) * RANKING.incrementCents,
    );
  }, [rawCents]);

  const wallet = useQuery({ queryKey: ["my-wallet"], queryFn: () => getMyWallet() });
  const stripe = useQuery({ queryKey: ["stripe-status"], queryFn: () => getStripeStatus() });

  const availablePoints = wallet.data?.availablePoints ?? 0;
  const neededPoints = pointsForCents(neededCents);
  const applyPoints = method === "points" ? Math.min(availablePoints, neededPoints) : 0;
  const leftoverCents = method === "points" ? Math.max(0, neededCents - applyPoints) : neededCents;

  const convert = useMutation({
    mutationFn: (points: number) => convertPointsToCredits({ data: { points } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-wallet"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const checkout = useMutation({
    mutationFn: (cents: number) =>
      createStripeCheckout({
        data: {
          cents,
          method,
          origin: window.location.origin,
        },
      }),
    onSuccess: (result) => {
      window.location.assign(result.url);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const busy = convert.isPending || checkout.isPending;
  const stripeReady = stripe.data?.configured ?? false;

  async function handleConfirm() {
    if (method === "points" && applyPoints > 0) {
      await convert.mutateAsync(applyPoints);
    }
    if (leftoverCents === 0) {
      toast.success("Points converted to credits. Allocate them on an approved listing.");
      navigate({ to: "/dashboard", search: { converted: true } });
      return;
    }
    if (!stripeReady) {
      toast.error("Checkout is not configured. Set STRIPE_SECRET_KEY.");
      return;
    }
    checkout.mutate(leftoverCents);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-8">
        <h1 className="text-2xl font-bold">
          {method === "points" ? "Buy with points" : "Buy with credits"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Credits land in your wallet. Allocate them on an approved listing to take the rank you
          previewed.
        </p>

        {canceled ? (
          <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
            Checkout was canceled. Nothing was charged.
          </p>
        ) : null}

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Selected rank</p>
          <p className="allocation-price mt-1 text-4xl leading-none">{formatCents(neededCents)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            1 point = 1 cent. Minimum top-up step {formatCents(RANKING.incrementCents)}.
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Credits</dt>
              <dd className="mt-1 font-semibold">
                {formatCents(wallet.data?.availableCents ?? 0)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-surface/60 p-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Points</dt>
              <dd className="mt-1 font-semibold">{formatPoints(availablePoints)}</dd>
            </div>
          </dl>

          {method === "points" ? (
            <ul className="mt-5 space-y-1.5 text-sm text-muted-foreground">
              <li>Needed: {formatPoints(neededPoints)}</li>
              <li>Applied now: {formatPoints(applyPoints)}</li>
              <li>
                Leftover to balance:{" "}
                {leftoverCents === 0 ? "none — points cover it" : formatCents(leftoverCents)}
              </li>
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Stripe will charge {formatCents(leftoverCents)} and add that to available credits.
            </p>
          )}

          {!stripeReady && leftoverCents > 0 ? (
            <p className="mt-4 rounded-lg border border-fall/40 bg-fall/10 px-3 py-2 text-sm text-fall">
              Checkout is not configured. Set <code>STRIPE_SECRET_KEY</code> and{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> to take card payments.
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button className="sm:flex-1" disabled={busy} onClick={() => void handleConfirm()}>
              {method === "points" ? <Coins className="size-4" /> : <Wallet className="size-4" />}
              {busy
                ? "Working…"
                : leftoverCents === 0
                  ? "Convert points"
                  : `Pay ${formatCents(leftoverCents)}`}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/dashboard">Back to listings</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
