import { createFileRoute } from "@tanstack/react-router";

import { RANKING } from "@/lib/ranking";

/**
 * Authenticated credit top-up. Body: { cents, method? }.
 * Prefer the createStripeCheckout server function from the app; this route is
 * the HTTP entry the plan called for.
 */
export const Route = createFileRoute("/api/stripe/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: { cents?: unknown; method?: unknown };
        try {
          body = (await request.json()) as { cents?: unknown; method?: unknown };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const cents = Number(body.cents);
        const method = body.method === "points" ? "points" : "credits";
        if (!Number.isInteger(cents) || cents <= 0 || cents % RANKING.incrementCents !== 0) {
          return Response.json({ error: "Invalid amount" }, { status: 400 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) {
          return Response.json({ error: "Supabase is not configured" }, { status: 500 });
        }
        const token = auth.slice("Bearer ".length);
        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await supabase.auth.getClaims(token);
        const userId = data?.claims?.sub;
        if (error || !userId) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const { createCreditCheckoutSession, isStripeConfigured, publicOriginFromRequest } =
            await import("@/lib/stripe.server");
          if (!isStripeConfigured()) {
            return Response.json(
              { error: "Checkout is not configured. Set STRIPE_SECRET_KEY." },
              { status: 503 },
            );
          }

          const origin = publicOriginFromRequest(request);
          const session = await createCreditCheckoutSession({
            userId,
            cents,
            origin,
            method,
          });
          return Response.json(session);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Checkout failed";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
