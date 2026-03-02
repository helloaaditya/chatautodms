import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const WEBHOOK_VERIFY_TOKEN = Deno.env.get("WEBHOOK_VERIFY_TOKEN")!;

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // 1. WEBHOOK VERIFICATION (GET request from Meta)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Verification failed", { status: 403 });
  }

  // 2. WEBHOOK PROCESSING (POST request from Meta)
  if (req.method === "POST") {
    const body = await req.json();

    if (body.object === "instagram") {
      for (const entry of body.entry) {
        const igAccountId = entry.id;

        // A. Handle Messaging (DMs)
        if (entry.messaging) {
          for (const messageObj of entry.messaging) {
            const senderId = messageObj.sender.id;
            const messageText = messageObj.message?.text;

            if (messageText) {
              // Trigger Automation Engine for DMs
              await triggerAutomation(supabase, igAccountId, senderId, messageText, "dm");
            }
          }
        }

        // B. Handle Changes (Comments)
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "comments") {
              const commentId = change.value.id;
              const commentText = change.value.text;
              const senderId = change.value.from.id;

              // Trigger Automation Engine for Comments
              await triggerAutomation(supabase, igAccountId, senderId, commentText, "comment", commentId);
            }
          }
        }
      }
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Not allowed", { status: 405 });
});

async function triggerAutomation(supabase: any, igAccountId: string, senderId: string, text: string, type: "dm" | "comment", commentId?: string) {
  // Call internal automation engine function
  // In production, use a Queue/Background job
  const { data: automations } = await supabase
    .from("automations")
    .select("*, flows(*)")
    .eq("instagram_account_id", igAccountId)
    .eq("trigger_type", type)
    .eq("is_active", true);

  if (automations && automations.length > 0) {
    // Basic Keyword Matching
    for (const automation of automations) {
      const keywords = automation.trigger_keywords || [];
      const isMatch = keywords.some((kw: string) => text.toLowerCase().includes(kw.toLowerCase()));

      if (isMatch) {
        // Execute Flow
        await executeFlow(supabase, automation.flows[0], senderId, commentId);
      }
    }
  }
}

async function executeFlow(supabase: any, flow: any, senderId: string, commentId?: string) {
  // Simplified flow executor
  // 1. Log analytics
  await supabase.from("analytics").insert({
    instagram_account_id: flow.instagram_account_id,
    automation_id: flow.automation_id,
    event_type: "automation_triggered"
  });

  // 2. Fetch the start node and send a message
  // In a real system, you'd traverse the flow nodes
  const startNode = flow.nodes.find((n: any) => n.type === "start");
  if (startNode) {
     // Trigger actual Meta API to send message (handled in automation service)
  }
}
