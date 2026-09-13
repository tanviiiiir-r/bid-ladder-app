import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createPublicSupabase } from "./supabase-public.server";
import {
  BOARDS,
  RANKING,
  type BoardKind,
  costToClaimFirstCents,
  costToOvertakeCents,
  isBoardVisible,
  utcDateString,
} from "./ranking";

export type BoardListing = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  url: string;
  description: string;
  approvedAt: string | null;
  categoryName: string;
  categorySlug: string;
  rank: number | null;
  previousRank: number | null;
  uniqueViews: number;
  shares: number;
  /** When the persisted ranking row was last recomputed. */
  computedAt: string | null;
  allocationCents: number;
  costToOvertakeCents: number;
  costToClaimFirstCents: number;
  board: BoardKind;
  isBoardVisible: boolean;
};

type RankEmbed = {
  rank: number;
  previous_rank: number | null;
  unique_views: number;
  shares: number;
  computed_at: string | null;
  score?: number | null;
} | null;

type ListingRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  url: string;
  description: string;
  approved_at: string | null;
  allocation_cents: number | null;
  categories: { name: string; slug: string } | null;
  rankings?: RankEmbed;
  today_rankings?: RankEmbed;
};

const LISTING_SELECT =
  "id, slug, name, tagline, url, description, approved_at, allocation_cents, categories(name, slug), rankings(rank, previous_rank, unique_views, shares, computed_at, score), today_rankings(rank, previous_rank, unique_views, shares, computed_at, score)";

const boardInput = z.object({
  category: z.string().optional(),
  board: z.enum(BOARDS).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function rankFrom(row: ListingRow, board: BoardKind): RankEmbed {
  return board === "today" ? (row.today_rankings ?? null) : (row.rankings ?? null);
}

function allocationFrom(row: ListingRow, board: BoardKind, rank: RankEmbed): number {
  if (board === "today" && rank?.score != null) return Number(rank.score);
  return row.allocation_cents ?? 0;
}

function toListing(row: ListingRow, board: BoardKind): BoardListing {
  const rank = rankFrom(row, board);
  const allocationCents = allocationFrom(row, board, rank);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    url: row.url,
    description: row.description,
    approvedAt: row.approved_at,
    categoryName: row.categories?.name ?? "—",
    categorySlug: row.categories?.slug ?? "",
    rank: rank?.rank ?? null,
    previousRank: rank?.previous_rank ?? null,
    uniqueViews: rank?.unique_views ?? 0,
    shares: rank?.shares ?? 0,
    computedAt: rank?.computed_at ?? null,
    allocationCents,
    costToOvertakeCents: 0,
    costToClaimFirstCents: 0,
    board,
    isBoardVisible: isBoardVisible(allocationCents) && rank != null,
  };
}

function withCosts(listings: BoardListing[]): BoardListing[] {
  const first = listings[0];
  const firstAllocation = first?.allocationCents ?? null;
  return listings.map((row, index) => {
    const above = index > 0 ? listings[index - 1] : undefined;
    return {
      ...row,
      costToClaimFirstCents: costToClaimFirstCents(firstAllocation, row.rank === 1),
      costToOvertakeCents: costToOvertakeCents(
        row.allocationCents,
        above?.allocationCents ?? null,
        above?.rank === 1,
      ),
    };
  });
}

function matchesCategory(row: { categories: { slug: string } | null }, category?: string) {
  if (!category || category === "all") return true;
  return row.categories?.slug === category;
}

/**
 * Public reads are detached from ranking recompute: they only read persisted
 * rankings. Recompute is server-only — allocation mutations plus the
 * admin approve/reject path. Never triggered by a public GET.
 */

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name")
      .eq("status", "active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  } catch (error) {
    // A backend hiccup must not blank the board-first homepage.
    console.error("[categories] read failed", error);
    return [] as { id: string; slug: string; name: string }[];
  }
});

export const getDailyArchiveDates = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("daily_rank_snapshots")
    .select("utc_date")
    .order("utc_date", { ascending: false })
    .limit(400);
  if (error) throw new Error(error.message);
  const dates = [...new Set((data ?? []).map((row) => row.utc_date))];
  return dates;
});

async function loadLiveBoard(
  board: Exclude<BoardKind, "daily">,
  category?: string,
): Promise<BoardListing[]> {
  const supabase = createPublicSupabase();
  let query = supabase.from("listings").select(LISTING_SELECT).eq("status", "approved");
  if (category && category !== "all") {
    query = query.eq("categories.slug", category);
  }

  const { data: rows, error } = await query.limit(400);
  if (error) {
    console.error("[board] read failed", error.message);
    throw new Error("The board couldn't load right now. Please retry.");
  }

  return withCosts(
    ((rows ?? []) as unknown as ListingRow[])
      .filter((row) => matchesCategory(row, category))
      .map((row) => toListing(row, board))
      .filter((row) => row.isBoardVisible)
      .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999)),
  );
}

async function loadDailyArchive(date: string, category?: string): Promise<BoardListing[]> {
  const supabase = createPublicSupabase();
  const { data: rows, error } = await supabase
    .from("daily_rank_snapshots")
    .select(
      "utc_date, rank, allocation_cents, unique_views, shares, frozen_at, listings!inner(id, slug, name, tagline, url, description, approved_at, allocation_cents, status, categories(name, slug))",
    )
    .eq("utc_date", date)
    .eq("listings.status", "approved")
    .order("rank", { ascending: true })
    .limit(400);
  if (error) {
    console.error("[board] daily archive read failed", error.message);
    throw new Error("The board couldn't load right now. Please retry.");
  }

  type SnapshotRow = {
    rank: number;
    allocation_cents: number;
    unique_views: number;
    shares: number;
    frozen_at: string;
    listings: ListingRow | ListingRow[] | null;
  };

  const listings = ((rows ?? []) as unknown as SnapshotRow[])
    .map((row) => {
      const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
      if (!listing) return null;
      if (!matchesCategory(listing, category)) return null;
      return {
        id: listing.id,
        slug: listing.slug,
        name: listing.name,
        tagline: listing.tagline,
        url: listing.url,
        description: listing.description,
        approvedAt: listing.approved_at,
        categoryName: listing.categories?.name ?? "—",
        categorySlug: listing.categories?.slug ?? "",
        rank: row.rank,
        previousRank: null,
        uniqueViews: row.unique_views,
        shares: row.shares,
        computedAt: row.frozen_at,
        allocationCents: row.allocation_cents,
        costToOvertakeCents: 0,
        costToClaimFirstCents: 0,
        board: "daily" as const,
        isBoardVisible: true,
      };
    })
    .filter((row) => row != null);

  return withCosts(listings);
}

export const getBoard = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => boardInput.parse(data ?? {}))
  .handler(async ({ data }): Promise<BoardListing[]> => {
    const board = data.board ?? "all_time";
    const today = utcDateString();
    if (board === "daily") {
      const date = data.date ?? today;
      if (date === today) return loadLiveBoard("today", data.category);
      return loadDailyArchive(date, data.category);
    }
    return loadLiveBoard(board, data.category);
  });

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        slug: z.string().min(1),
        board: z.enum(BOARDS).optional(),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<BoardListing | null> => {
    const board = data.board ?? "all_time";
    const supabase = createPublicSupabase();
    const { data: row, error } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "approved")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const listing = toListing(row as unknown as ListingRow, board === "daily" ? "all_time" : board);
    const peers = await getBoard({
      data: { board, category: listing.categorySlug, date: data.date },
    });
    const onBoard = peers.find((peer) => peer.id === listing.id);
    if (onBoard) return onBoard;

    const first = peers[0];
    return {
      ...listing,
      board,
      isBoardVisible: false,
      rank: null,
      previousRank: null,
      costToClaimFirstCents: costToClaimFirstCents(first?.allocationCents ?? null, false),
      costToOvertakeCents: isBoardVisible(listing.allocationCents)
        ? costToOvertakeCents(listing.allocationCents, first?.allocationCents ?? null, true)
        : Math.max(0, RANKING.minVisibleCents - listing.allocationCents),
    };
  });

const VISITOR_COOKIE = "bl_vid";

/**
 * Server-minted visitor identity.
 * Client-supplied keys are never trusted: the key is derived from an httpOnly
 * cookie the server sets, hashed with a server-only secret so it can't be
 * guessed or replayed from the browser.
 * Residual risk: clearing cookies / private windows still mints a new identity,
 * so a determined actor can inflate unique counts. Acceptable for the MVP; the
 * per-visitor rate limit and dedupe index bound the damage.
 */
async function resolveVisitorKey(): Promise<{ key: string; setCookie: string | null }> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const { createHash, randomUUID } = await import("node:crypto");

  const cookieHeader = getRequestHeader("cookie") ?? "";
  const existing = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${VISITOR_COOKIE}=`))
    ?.slice(VISITOR_COOKIE.length + 1);

  const raw = existing && existing.length >= 16 ? existing : randomUUID();
  const salt = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_URL"] ?? "bl";
  const key = createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 40);

  const setCookie =
    existing === raw
      ? null
      : `${VISITOR_COOKIE}=${raw}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`;

  return { key, setCookie };
}

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        kind: z.enum(["view", "share"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const { setResponseHeader } = await import("@tanstack/react-start/server");
      const { key, setCookie } = await resolveVisitorKey();
      if (setCookie) setResponseHeader("set-cookie", setCookie);

      // Anon has no direct insert path; only this server-only RPC records events.
      // It enforces approval, dedupe per (listing, kind, visitor) and a rate limit.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.rpc("record_event", {
        _listing_id: data.listingId,
        _kind: data.kind,
        _visitor_key: key,
      });
      if (error) console.error("[events] record failed", error.message);
    } catch (error) {
      console.error("[events] record failed", error);
    }
    return { ok: true };
  });
