import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";

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
    ]);
  },
  head: () => ({
    meta: [
      { title: "Bid Ladder — Take #1 with real credits" },
      {
        name: "description",
        content:
          "No fake heat. Allocation is the rank. Type a dollar amount and see where you land — then pay, then allocate.",
      },
      { property: "og:title", content: "Bid Ladder — Take #1 with real credits" },
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
        <div className="mx-auto max-w-[80rem] px-4 py-16 text-center sm:px-8" role="alert">
          <h1 className="font-display text-3xl">The board couldn't load</h1>
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
        <div className="mx-auto w-full max-w-[80rem] px-4 pb-24 pt-10 sm:px-8 sm:pt-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
            <div>
              <h1 className="max-w-[14ch] text-[2.5rem] leading-none tracking-[-0.022em] sm:text-6xl">
                Take #1 with real credits.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground lg:hidden">
                No fake heat. Allocation is the rank. Minimum{" "}
                {formatCents(RANKING.minVisibleCents)} to appear,{" "}
                {formatCents(RANKING.incrementCents)} steps, and{" "}
                {formatCents(RANKING.numberOnePremiumCents)} more than the leader to take #1.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button asChild variant="secondary">
                  <Link to="/submit">Submit</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/how-ranking-works">
                    <Scale className="size-4" />
                    How ranking works
                  </Link>
                </Button>
              </div>
            </div>
            <p className="hidden max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base lg:block">
              No fake heat. Allocation is the rank. Minimum{" "}
              {formatCents(RANKING.minVisibleCents)} to appear,{" "}
              {formatCents(RANKING.incrementCents)} steps, and{" "}
              {formatCents(RANKING.numberOnePremiumCents)} more than the leader to take #1.
            </p>
          </div>

          <div className="mt-12">
            <ClaimRankControl listings={listings} archived={archivedDaily} />
          </div>

          <div className="mt-4">
            <RanksFreshness listings={listings} />
          </div>

          <RisingStrip listings={listings} />

          <div className="mt-10 overflow-hidden rounded-xl border-[0.5px] border-border bg-card">
            <div className="grid grid-cols-1 items-center gap-3 p-3 sm:flex sm:justify-between sm:px-4">
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

            <div className="border-t-[0.5px] border-border px-3 py-3 sm:px-4">
              <CategoryFilter
                categories={categories}
                active={category}
                onChange={(slug) => setSearch({ category: slug })}
              />
            </div>

            {board === "daily" ? (
              <p className="border-t-[0.5px] border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
                {selectedDate === today
                  ? `${selectedDate} is today's live UTC board — positions can still change until UTC midnight.`
                  : `${selectedDate} is a frozen archive of that closed UTC day. It no longer updates.`}
              </p>
            ) : null}

          {listings.length > 0 && listings.length <= 3 ? (
            <p className="border-t-[0.5px] border-border px-3 py-3 text-xs text-muted-foreground sm:px-4">
              Early board: only {listings.length} listed{" "}
              {listings.length === 1 ? "product" : "products"} here so far. Positions move fast —
              and we don't seed fake popularity.
            </p>
          ) : null}

            {listings.length === 0 ? (
              <div className="border-t-[0.5px] border-border px-4 py-12 text-center">
                <p className="font-display text-2xl">The ladder is empty</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Nobody has allocated at least {formatCents(RANKING.minVisibleCents)} on this board
                  yet. We don't seed fake listings, so this stays empty until someone takes a
                  position.
                </p>
                <div className="mt-5 flex flex-col items-center gap-2">
                  <Button asChild variant="secondary">
                    <Link to="/submit">Submit your product</Link>
                  </Button>
                  <Link
                    to="/how-ranking-works"
                    className="text-xs text-foreground underline-offset-2 hover:underline"
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
              className="text-foreground underline-offset-2 hover:underline"
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
