import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthedContext = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: AuthedContext) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: Boolean(data) };
  });

export const getReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("listings")
      .select(
        "id, slug, name, tagline, url, description, status, rejection_reason, created_at, categories(name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_audit_log")
      .select("id, action, reason, created_at, listing_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const reviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        listingId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    if (data.action === "reject" && !data.reason) {
      throw new Error("A reason is required when rejecting a listing.");
    }

    const { error } = await context.supabase
      .from("listings")
      .update(
        data.action === "approve"
          ? { status: "approved", approved_at: new Date().toISOString(), rejection_reason: null }
          : { status: "rejected", approved_at: null, rejection_reason: data.reason ?? null },
      )
      .eq("id", data.listingId);
    if (error) throw new Error(error.message);

    const { error: logError } = await context.supabase.from("admin_audit_log").insert({
      admin_id: context.userId,
      listing_id: data.listingId,
      action: data.action,
      reason: data.reason ?? null,
    });
    if (logError) throw new Error(logError.message);

    // Service-role recompute right after review so an approved listing is
    // ranked immediately instead of waiting for the scheduled refresh.
    // Public reads never trigger this.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: rankError } = await supabaseAdmin.rpc("recompute_rankings");
    if (rankError) console.error("[rankings] post-review recompute failed", rankError.message);

    return { ok: true };
  });

export const recomputeRankings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("recompute_rankings");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
