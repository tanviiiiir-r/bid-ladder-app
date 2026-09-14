import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, CalendarDays, Coins, Eye } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { formatCents } from "@/lib/format";
import { RANKING, MOVEMENT } from "@/lib/ranking";
import { publicSiteUrl } from "@/lib/site-url";

function rankingPageUrl() {
  const origin = publicSiteUrl();
  return origin ? `${origin}/how-ranking-works` : "/how-ranking-works";
}
const HEADLINE = "Credits allocated to a listing determine its rank.";

export const Route = createFileRoute("/how-ranking-works")({
  head: () => ({
    meta: [
      { title: "How ranking works — Bid Ladder" },
      {
        name: "description",
        content: `Bid Ladder ranking ${RANKING.version} in full: credits allocated to a listing determine its rank. Views and shares are watch-only analytics.`,
      },
      { property: "og:title", content: "How ranking works — Bid Ladder" },
      {
        property: "og:description",
        content: `${HEADLINE} Minimum ${formatCents(RANKING.minVisibleCents)} to appear, ${formatCents(RANKING.incrementCents)} steps.`,
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: rankingPageUrl() },
    ],
    links: [{ rel: "canonical", href: rankingPageUrl() }],
  }),
  component: HowRankingWorksPage,
});

const notCounted = [
  "Unique views and shares — analytics only, never part of rank.",
  "Freshness, age or approval date — the retired view/share/freshness score is not the live formula.",
  "Bots, seeded popularity or bought votes of any kind.",
  "Manual vanity edits: nobody types a rank in by hand, and admin actions are written to an audit log.",
];

function HowRankingWorksPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <h1 className="font-display text-[2.5rem] leading-[1.08] tracking-[-0.02em] sm:text-5xl">
          How ranking works
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Ranking {RANKING.version}. This page documents exactly what the board computes today. If
          the rules change, this page changes with it.
        </p>

        <section className="mt-8 surface-card p-6">
          <h2 className="font-display text-[2rem] leading-tight">{HEADLINE}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Higher allocation ranks higher. When two listings hold the same amount, the one that got
            there first ranks above — ties break on the earlier allocation time, then on a stable
            internal id.
          </p>
        </section>

        <section className="mt-6 surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <Coins className="size-4" />
            The rules
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              Public boards hide any approved listing allocated below{" "}
              {formatCents(RANKING.minVisibleCents)}.
            </li>
            <li>Allocation moves in {formatCents(RANKING.incrementCents)} steps.</li>
            <li>
              To take #1 you must hold at least the current #1 plus{" "}
              {formatCents(RANKING.numberOnePremiumCents)}.
            </li>
            <li>Only approved listings take part.</li>
          </ul>
        </section>

        <section className="mt-6 surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <CalendarDays className="size-4" />
            The three boards
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">All-time</strong> — ranks the allocation a listing
              holds right now.
            </li>
            <li>
              <strong className="text-foreground">Today</strong> — ranks what was allocated during
              the current UTC calendar day, live.
            </li>
            <li>
              <strong className="text-foreground">Daily</strong> — the same day-scoped board, frozen
              at UTC midnight and kept as an archive.
            </li>
          </ul>
        </section>

        <section className="mt-6 surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <Eye className="size-4" />
            Views and shares are watch-only
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unique views and completed shares are still measured and shown so makers can see real
            interest, but they never affect rank. One view per visitor per listing; a share counts
            only when it actually completes.
          </p>
        </section>

        <section className="mt-6 surface-card p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <Ban className="size-4" />
            What never affects rank
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {notCounted.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-muted-foreground">•</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 surface-card p-6">
          <h2 className="font-display text-2xl">Movement (↑ / ↓)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every badge compares a listing to its position at the previous recompute. A listing with
            no previous position shows “New”.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            On sparse boards a move of a single position is shown as “Flat” unless the listing sits
            in the top {MOVEMENT.topN}. Numbers appear from {MOVEMENT.minDelta} positions of real
            movement. Nothing here is invented velocity.
          </p>
        </section>

        <Link to="/" className="mt-8 inline-block text-sm text-foreground underline-offset-2 hover:underline">
          ← Back to the board
        </Link>
      </main>
    </div>
  );
}
