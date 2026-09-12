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

const STALE_MS = 5 * 60 * 1000;

/** Recomputes rankings when the last recompute is older than STALE_MS. */
async function maybeRecompute() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("rankings")
      .select("computed_at")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const last = data?.computed_at ? new Date(data.computed_at).getTime() : 0;
    if (Date.now() - last > STALE_MS) {
      await supabaseAdmin.rpc("recompute_rankings");
    }
  } catch (error) {
    console.error("[rankings] recompute skipped", error);
  }
}

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getBoard = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ category: z.string().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<BoardListing[]> => {
    await maybeRecompute();

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

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        kind: z.enum(["view", "share"]),
        visitorKey: z.string().min(8).max(100),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const supabase = createPublicSupabase();
    // Unique per (listing, kind, visitor): duplicates are ignored, never inflated.
    const { error } = await supabase.from("events").insert({
      listing_id: data.listingId,
      kind: data.kind,
      visitor_key: data.visitorKey,
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.error("[events] insert failed", error.message);
    }
    return { ok: true };
  });
