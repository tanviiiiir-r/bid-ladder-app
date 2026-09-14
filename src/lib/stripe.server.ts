import Stripe from "stripe";

import { RANKING } from "@/lib/ranking";

export function stripeSecretKey(): string | null {
  return process.env["STRIPE_SECRET_KEY"]?.trim() || null;
}

export function stripeWebhookSecret(): string | null {
  return process.env["STRIPE_WEBHOOK_SECRET"]?.trim() || null;
}

export function isStripeConfigured(): boolean {
  return Boolean(stripeSecretKey());
}

export function publicOriginFromRequest(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  if (host) return `${proto}://${host.split(",")[0]!.trim()}`;
  return url.origin;
}

export function getStripe(): Stripe {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  // Cloudflare Workers have fetch, not Node http. Without this, checkout.sessions.create
  // can hang forever and the buy page stays on "Opening Stripe…".
  return new Stripe(key, {
    timeout: 20_000,
    maxNetworkRetries: 1,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function assertCheckoutCents(cents: number): number {
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new Error("Checkout amount must be a positive number of cents.");
  }
  if (cents % RANKING.incrementCents !== 0) {
    throw new Error(`Checkout must be in ${RANKING.incrementCents}-cent increments.`);
  }
  return cents;
}

export async function createCreditCheckoutSession(input: {
  userId: string;
  cents: number;
  origin: string;
  method: "credits" | "points";
}): Promise<{ url: string; sessionId: string }> {
  const cents = assertCheckoutCents(input.cents);
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "hosted",
    payment_method_types: ["card"],
    success_url: `${input.origin}/dashboard?topup=1`,
    cancel_url: `${input.origin}/credits/buy?cents=${cents}&method=${input.method}&canceled=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: cents,
          product_data: {
            name: "Bid Ladder credits",
            description: `Wallet top-up of $${(cents / 100).toFixed(2)}`,
          },
        },
      },
    ],
    metadata: {
      user_id: input.userId,
      cents: String(cents),
      kind: "credit_topup",
    },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url, sessionId: session.id };
}

export async function applyCompletedCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;
  if (session.metadata?.["kind"] !== "credit_topup") return;

  const userId = session.metadata?.["user_id"];
  const cents = session.amount_total ?? 0;
  if (!userId || !Number.isInteger(cents) || cents <= 0) {
    throw new Error("Checkout session is missing user or paid amount.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("apply_credit_topup", {
    _user_id: userId,
    _cents: cents,
    _idempotency_key: session.id,
  });
  if (error) throw new Error(error.message);
}
