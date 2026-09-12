import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "listing"}-${Math.random().toString(36).slice(2, 7)}`;
}

export const submitListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(60),
        tagline: z.string().trim().min(10).max(120),
        url: z.string().trim().url().max(300),
        description: z.string().trim().min(20).max(1200),
        categoryId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("listings")
      .insert({
        owner_id: context.userId,
        category_id: data.categoryId,
        name: data.name,
        tagline: data.tagline,
        url: data.url,
        description: data.description,
        slug: slugify(data.name),
        status: "pending",
      })
      .select("id, slug")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const getMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("listings")
      .select("id, slug, name, tagline, status, rejection_reason, created_at, categories(name)")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
