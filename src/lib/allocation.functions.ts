import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: wallet, error } = await context.supabase
      .from("wallets")
      .select("available_cents, available_points, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: listings, error: listingError } = await context.supabase
      .from("listings")
      .select("allocation_cents")
      .eq("owner_id", context.userId);
    if (listingError) throw new Error(listingError.message);

    const committedCents = (listings ?? []).reduce(
      (sum, row) => sum + (row.allocation_cents ?? 0),
      0,
    );
    const availableCents = wallet?.available_cents ?? 0;
    const availablePoints = wallet?.available_points ?? 0;

    return {
      availableCents,
      availablePoints,
      committedCents,
      updatedAt: wallet?.updated_at ?? null,
    };
  });

export const convertPointsToCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ points: z.number().int().nonnegative() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("convert_points_to_credits", {
      _points: data.points,
    });
    if (error) throw new Error(error.message);
    return result;
  });

export const setListingAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        newCents: z.number().int().nonnegative(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: listing, error: listingError } = await context.supabase
      .from("listings")
      .select("id, owner_id")
      .eq("id", data.listingId)
      .maybeSingle();
    if (listingError) throw new Error(listingError.message);
    if (!listing) throw new Error("listing not found");

    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (listing.owner_id !== context.userId && !adminRow) {
      throw new Error("not allowed");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("set_allocation", {
      _listing_id: data.listingId,
      _new_cents: data.newCents,
    });
    if (error) throw new Error(error.message);
    return result;
  });
