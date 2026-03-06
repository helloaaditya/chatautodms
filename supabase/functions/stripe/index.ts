import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Stripe from "https://esm.sh/stripe@12.18.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");

  if (!sig) return new Response("No signature", { status: 400 });

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, endpointSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status;
      const planId = subscription.items.data[0].plan.id;

      // Map Stripe Plan to App Tier (sync with src/lib/subscription.ts: free | premium | ultra_premium)
      let tier = "free";
      if (planId === Deno.env.get("STRIPE_PRO_PLAN_ID")) tier = "premium";
      if (planId === Deno.env.get("STRIPE_AGENCY_PLAN_ID")) tier = "ultra_premium";

      // Update User Profile
      await supabase
        .from("profiles")
        .update({ subscription_tier: tier, subscription_status: status })
        .eq("stripe_customer_id", customerId);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabase
        .from("profiles")
        .update({ subscription_tier: "free", subscription_status: "canceled" })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
