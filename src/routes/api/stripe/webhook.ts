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
        try {
          const event = getStripe().webhooks.constructEvent(raw, signature, secret);
          if (event.type === "checkout.session.completed") {
            await applyCompletedCheckout(event.data.object);
          }
          return Response.json({ received: true });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Webhook rejected";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
