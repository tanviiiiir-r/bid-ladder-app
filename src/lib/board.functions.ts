import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createPublicSupabase } from "./supabase-public.server";

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
};

type Row = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  url: string;
  description: string;
  approved_at: string | null;
  categories: { name: string; slug: string } | null;
  rankings: {
    rank: number;
    previous_rank: number | null;
    unique_views: number;
    shares: number;
  } | null;
};

const SELECT =
  "id, slug, name, tagline, url, description, approved_at, categories(name, slug), rankings(rank, previous_rank, unique_views, shares)";

function toListing(row: Row): BoardListing {
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
    rank: row.rankings?.rank ?? null,
    previousRank: row.rankings?.previous_rank ?? null,
    uniqueViews: row.rankings?.unique_views ?? 0,
    shares: row.rankings?.shares ?? 0,
  };
}

/**
 * Public reads are detached from ranking recompute: they only read persisted
 * rankings. Recompute is server-only — a scheduled database job plus the
 * admin approve/reject path. Never triggered by a public GET.
 */

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("id, slug, name")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  } catch (error) {
    // A backend hiccup must not blank the board-first homepage.
    console.error("[categories] read failed", error);
    return [] as { id: string; slug: string; name: string }[];
  }
});

export const getBoard = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ category: z.string().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<BoardListing[]> => {
    try {
      const supabase = createPublicSupabase();
      let query = supabase.from("listings").select(SELECT).eq("status", "approved");
      if (data.category && data.category !== "all") {
        query = query.eq("categories.slug", data.category);
      }

      const { data: rows, error } = await query.limit(200);
      if (error) throw new Error(error.message);

      return ((rows ?? []) as unknown as Row[])
        .filter((row) => (data.category && data.category !== "all" ? row.categories : true))
        .map(toListing)
        .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
    } catch (error) {
      // Never 500 the homepage on a transient backend read failure.
      console.error("[board] read failed", error);
      return [];
    }
  });

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<BoardListing | null> => {
    const supabase = createPublicSupabase();
    const { data: row, error } = await supabase
      .from("listings")
      .select(SELECT)
      .eq("status", "approved")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? toListing(row as unknown as Row) : null;
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

  const setCookie = existing === raw
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
