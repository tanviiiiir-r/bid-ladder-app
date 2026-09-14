import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RANKING } from "@/lib/ranking";

export const getStripeStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: Boolean(process.env["STRIPE_SECRET_KEY"]?.trim()) };
});

export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        cents: z.number().int().positive(),
        method: z.enum(["credits", "points"]).default("credits"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.cents % RANKING.incrementCents !== 0) {
      throw new Error(`Amount must be in ${RANKING.incrementCents}-cent increments.`);
    }
    const { createCreditCheckoutSession, isStripeConfigured, publicOriginFromRequest } =
      await import("@/lib/stripe.server");
    if (!isStripeConfigured()) {
      throw new Error("Checkout is not configured. Set STRIPE_SECRET_KEY.");
    }
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const origin = publicOriginFromRequest(request);
    return createCreditCheckoutSession({
      userId: context.userId,
      cents: data.cents,
      origin,
      method: data.method,
    });
  });
