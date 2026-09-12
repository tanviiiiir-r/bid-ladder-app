import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";

import { CategoryFilter } from "@/components/board/CategoryFilter";
import { ListingCard } from "@/components/board/ListingCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { boardQuery, categoriesQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } =>
    typeof search["category"] === "string" ? { category: search["category"] } : {},
  loaderDeps: ({ search }) => ({ category: search.category ?? "all" }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(boardQuery(deps.category)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Bid Ladder — The live board of what's getting attention" },
      {
        name: "description",
        content:
          "A regional discovery board for early-stage AI, SaaS and tools. Ranked by real attention: unique views, shares and freshness. No pay-to-rank.",
      },
      { property: "og:title", content: "Bid Ladder — The live attention board" },
      {
        property: "og:description",
        content: "Discover early-stage AI, SaaS and tools ranked by real attention only.",
      },
    ],
  }),
  component: BoardPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center" role="alert">
      <h1 className="font-display text-xl font-semibold">The board couldn't load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">
      Nothing on the board yet.
    </div>
  ),
});

function BoardPage() {
  const { category = "all" } = Route.useSearch();
  const navigate = useNavigate();
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const { data: listings } = useSuspenseQuery(boardQuery(category));
  useBoardRealtime();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="board-grid-bg">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Flame className="size-3.5" />
              Live board · real signals only
            </span>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              What's getting attention right now
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Early-stage AI, SaaS and tools ranked by unique views, shares and freshness. No paid
              placement, no seeded popularity.
            </p>
          </div>

          <div className="mt-7">
            <CategoryFilter
              categories={categories}
              active={category}
              onChange={(slug) =>
                navigate({ to: "/", search: (prev) => ({ ...prev, category: slug }) })
              }
            />
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {listings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
                <p className="font-display text-lg font-semibold">The ladder is empty</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  No approved listings in this category yet. Real rankings start as soon as makers
                  submit and visitors show up.
                </p>
                <Button asChild className="mt-5">
                  <Link to="/submit">Submit your product</Link>
                </Button>
              </div>
            ) : (
              listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Movement (↑/↓) compares each listing to the previous ranking recompute. Money never buys
            organic position —{" "}
            <Link to="/how-ranking-works" className="text-primary underline-offset-2 hover:underline">
              see how ranking works
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
