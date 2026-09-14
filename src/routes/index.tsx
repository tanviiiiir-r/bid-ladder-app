import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Flame, Scale } from "lucide-react";

import { BoardTabs } from "@/components/board/BoardTabs";
import { CategoryFilter } from "@/components/board/CategoryFilter";
import { ClaimRankControl } from "@/components/board/ClaimRankControl";
import { ListingCard } from "@/components/board/ListingCard";
import { RanksFreshness } from "@/components/board/RanksFreshness";
import { RisingStrip } from "@/components/board/RisingStrip";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { formatCents } from "@/lib/format";
import { boardQuery, categoriesQuery, dailyArchiveDatesQuery } from "@/lib/queries";
import { BOARDS, RANKING, utcDateString, type BoardKind } from "@/lib/ranking";

type BoardSearch = { category?: string; board?: BoardKind; date?: string };

function parseBoard(value: unknown): BoardKind | undefined {
  return typeof value === "string" && (BOARDS as readonly string[]).includes(value)
    ? (value as BoardKind)
    : undefined;
}

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): BoardSearch => {
    const out: BoardSearch = {};
    if (typeof search["category"] === "string") out.category = search["category"];
    const board = parseBoard(search["board"]);
    if (board) out.board = board;
    if (typeof search["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search["date"])) {
      out.date = search["date"];
    }
    return out;
  },
  loaderDeps: ({ search }) => ({
    category: search.category ?? "all",
    board: search.board ?? ("all_time" as BoardKind),
    date: search.date,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesQuery()),
      context.queryClient.ensureQueryData(dailyArchiveDatesQuery()),
      context.queryClient.ensureQueryData(boardQuery(deps.category, deps.board, deps.date)),
      context.queryClient.ensureQueryData(boardQuery(deps.category, "today")),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Bid Ladder — The live allocation board" },
      {
        name: "description",
        content:
          "The live board of early-stage AI, SaaS and tools. Credits allocated to a listing determine its rank. All-time, Today and Daily boards.",
      },
      { property: "og:title", content: "Bid Ladder — The live allocation board" },
      {
        property: "og:description",
        content:
          "Credits allocated to a listing determine its rank. Claim #1 on the All-time, Today or Daily board.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BoardPage,
  errorComponent: BoardError,
  notFoundComponent: () => (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">
      Nothing on the board yet.
    </div>
  ),
});

function BoardError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="board-grid-bg">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center" role="alert">
          <h1 className="font-display text-xl font-semibold">The board couldn't load</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {error.message} This is a loading problem, not an empty board — no listings were lost.
          </p>
          <Button className="mt-5" onClick={() => void router.invalidate()}>
            Retry
          </Button>
        </div>
      </main>
    </div>
  );
}

function BoardPage() {
  const { category = "all", board = "all_time", date } = Route.useSearch();
  const navigate = useNavigate();
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const { data: archiveDates } = useSuspenseQuery(dailyArchiveDatesQuery());
  const { data: listings } = useSuspenseQuery(boardQuery(category, board, date));
  useBoardRealtime();

  const today = utcDateString();
  const selectedDate = board === "daily" ? (date ?? today) : today;
  const dateOptions = [today, ...archiveDates.filter((d) => d !== today)];
  const archivedDaily = board === "daily" && selectedDate !== today;

  const setSearch = (next: Partial<BoardSearch>) =>
    navigate({ to: "/", search: (prev) => ({ ...prev, ...next }) });

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="board-grid-bg">
        <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Flame className="size-3.5" />
              Live board
            </span>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              What's getting attention right now
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Credits allocated to a listing determine its rank. Minimum{" "}
              {formatCents(RANKING.minVisibleCents)} to appear,{" "}
              {formatCents(RANKING.incrementCents)} steps, and{" "}
              {formatCents(RANKING.numberOnePremiumCents)} more than the leader to take #1.
            </p>

            <ClaimRankControl listings={listings} archived={archivedDaily} />

            <Link
              to="/how-ranking-works"
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Scale className="size-3.5" />
              How ranking works
            </Link>

            <RanksFreshness listings={listings} />
          </div>

          <RisingStrip listings={listings} />

          <div className="mt-6 rounded-2xl border border-border bg-surface/60 p-3 sm:p-4">
            <div className="grid grid-cols-1 items-center gap-3 sm:flex sm:justify-between">
              <BoardTabs active={board} onChange={(next) => setSearch({ board: next })} />
              {board === "daily" ? (
                <Select value={selectedDate} onValueChange={(value) => setSearch({ date: value })}>
                  <SelectTrigger className="w-full shrink-0 sm:w-[210px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === today ? `${option} · today (live)` : `${option} · archive`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="mt-3 border-t border-border pt-3">
              <CategoryFilter
                categories={categories}
                active={category}
                onChange={(slug) => setSearch({ category: slug })}
              />
            </div>

            {board === "daily" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedDate === today
                  ? `${selectedDate} is today's live UTC board — positions can still change until UTC midnight.`
                  : `${selectedDate} is a frozen archive of that closed UTC day. It no longer updates.`}
              </p>
            ) : null}
          </div>

          {listings.length > 0 && listings.length <= 3 ? (
            <p className="mt-5 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
              Early board: only {listings.length} listed{" "}
              {listings.length === 1 ? "product" : "products"} here so far. Positions move fast —
              and we don't seed fake popularity.
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            {listings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
                <p className="font-display text-lg font-semibold">The ladder is empty</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Nobody has allocated at least {formatCents(RANKING.minVisibleCents)} on this board
                  yet. We don't seed fake listings, so this stays empty until someone takes a
                  position.
                </p>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <Button asChild>
                    <Link to="/submit">Submit your product</Link>
                  </Button>
                  <Link
                    to="/how-ranking-works"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    See how ranking works
                  </Link>
                </div>
              </div>
            ) : (
              listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Credits allocated to a listing determine its rank. Equal allocations are broken by who
            got there first —{" "}
            <Link
              to="/how-ranking-works"
              className="text-primary underline-offset-2 hover:underline"
            >
              see how ranking works
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
