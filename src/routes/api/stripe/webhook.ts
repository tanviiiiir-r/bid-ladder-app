import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getStripe, stripeWebhookSecret, applyCompletedCheckout } =
          await import("@/lib/stripe.server");
        const secret = stripeWebhookSecret();
        if (!secret) {
          return Response.json(
            { error: "Checkout is not configured. Set STRIPE_WEBHOOK_SECRET." },
            { status: 503 },
          );
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return Response.json({ error: "Missing stripe-signature" }, { status: 400 });
        }

        const raw = await request.text();
        let event;
        try {
          // Cloudflare/Workers only expose SubtleCrypto, which Stripe's sync
          // constructEvent cannot use. constructEventAsync is required there.
          event = await getStripe().webhooks.constructEventAsync(raw, signature, secret);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Webhook rejected";
          return Response.json({ error: message }, { status: 400 });
        }

        try {
          if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            await applyCompletedCheckout(event.data.object);
          }
          return Response.json({ received: true });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Webhook processing failed";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
