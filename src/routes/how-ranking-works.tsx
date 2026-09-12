import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, Eye, Share2, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { RANKING, MOVEMENT } from "@/lib/ranking";

const URL = "https://rising-star-board.lovable.app/how-ranking-works";

export const Route = createFileRoute("/how-ranking-works")({
  head: () => ({
    meta: [
      { title: "How ranking works — Bid Ladder" },
      {
        name: "description",
        content:
          "Bid Ladder ranking v0.1 in full: unique views, completed shares and freshness. No paid placement — money never buys organic position.",
      },
      { property: "og:title", content: "How ranking works — Bid Ladder" },
      {
        property: "og:description",
        content: "The exact formula behind the board. Real signals only, no pay-to-rank.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: HowRankingWorksPage,
});

const forbidden = [
  "Paying for a higher position — there is no paid rank, and no plan to sell one here.",
  "Bought votes, bots or seeded popularity of any kind.",
  "Manual vanity edits: nobody edits a rank by hand, and any admin action is written to an audit log.",
  "Payments, credits or bids — none of them appear anywhere in the score.",
];

function HowRankingWorksPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <h1 className="text-3xl font-bold sm:text-4xl">How ranking works</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Ranking {RANKING.version}. This page documents exactly what the board computes today. If
          the formula changes, this page changes with it.
        </p>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">The formula</h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface p-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
{`freshness_days = max(0, ${RANKING.freshnessWindowDays} − days_since_approval)
score = unique_views × ${RANKING.viewWeight}
      + shares × ${RANKING.shareWeight}
      + freshness_days × ${RANKING.freshnessWeight}
rank  = highest score first`}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Only approved listings take part. Ties break on a stable internal id, never on who paid
            or who asked.
          </p>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <Eye className="size-4 text-primary" />
            <h3 className="mt-2 font-display font-semibold">Unique views</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              One view per visitor per listing. Reloading a page or spamming hits adds nothing.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <Share2 className="size-4 text-primary" />
            <h3 className="mt-2 font-display font-semibold">Completed shares</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Counted only when a share actually completes. Dismissing the share sheet records
              nothing, and repeats from the same visitor don&apos;t stack.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <Sparkles className="size-4 text-primary" />
            <h3 className="mt-2 font-display font-semibold">Freshness</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A newly approved listing gets a boost that decays to zero over{" "}
              {RANKING.freshnessWindowDays} days, so new work gets a fair first look.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-display text-lg font-semibold">Money never buys organic position</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            There is no paid rank on Bid Ladder. No boost to buy, no bid for #1, no fee to be
            considered. If paid placement is ever introduced, it would be clearly labelled and kept
            completely separate from the organic score — and it is not part of the product today.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Ban className="size-4 text-fall" />
            What never affects rank
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {forbidden.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-fall">•</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Movement (↑ / ↓)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every badge compares a listing to its position at the previous recompute — not to a
            social vanity clock. A listing with no previous position shows “New”.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            To keep early, low-traffic days honest, a move of a single position is shown as “Flat”
            unless the listing sits in the top {MOVEMENT.topN}. Numbers appear from{" "}
            {MOVEMENT.minDelta} positions of real movement. Nothing here is animated velocity or an
            invented trend score.
          </p>
        </section>

        <section className="mt-6 rounded-xl border border-dashed border-border bg-surface/50 p-5">
          <h2 className="font-display text-lg font-semibold">Worked example</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Illustrative round numbers only — not live data from the board.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Example</th>
                  <th className="py-2 pr-3">Views</th>
                  <th className="py-2 pr-3">Shares</th>
                  <th className="py-2 pr-3">Days old</th>
                  <th className="py-2">Score</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border">
                  <td className="py-2 pr-3">A</td>
                  <td className="py-2 pr-3">100</td>
                  <td className="py-2 pr-3">10</td>
                  <td className="py-2 pr-3">20</td>
                  <td className="rank-number py-2">365</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 pr-3">B</td>
                  <td className="py-2 pr-3">60</td>
                  <td className="py-2 pr-3">30</td>
                  <td className="py-2 pr-3">0</td>
                  <td className="rank-number py-2">375</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 pr-3">C</td>
                  <td className="py-2 pr-3">200</td>
                  <td className="py-2 pr-3">0</td>
                  <td className="py-2 pr-3">40</td>
                  <td className="rank-number py-2">600</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            C leads on sustained attention, B edges past A because shares weigh more than views and
            it was just approved.
          </p>
        </section>

        <Link to="/" className="mt-8 inline-block text-sm text-primary">
          ← Back to the board
        </Link>
      </main>
    </div>
  );
}
