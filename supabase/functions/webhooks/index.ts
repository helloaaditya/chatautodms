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
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad body", { status: 400 });
    }

    if (body.object === "instagram" && Array.isArray(body.entry)) {
      for (const entry of body.entry as Array<Record<string, unknown>>) {
        const igAccountId = entry.id as string;
        if (!igAccountId) continue;

        // A. Handle Messaging (DMs)
        if (Array.isArray(entry.messaging)) {
          for (const messageObj of entry.messaging as Array<{ sender?: { id?: string }; message?: { text?: string } }>) {
            const senderId = messageObj.sender?.id;
            const messageText = messageObj.message?.text;
            if (senderId && messageText) {
              await triggerAutomation(supabase, igAccountId, senderId, messageText, "dm");
            }
          }
        }

        // B. Handle Changes (Comments) – support both full value object and minimal payloads
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes as Array<{ field?: string; value?: Record<string, unknown> }>) {
            if (change.field !== "comments" || !change.value) continue;
            const v = change.value as Record<string, unknown>;
            const commentId = typeof v.id === "string" ? v.id : null;
            const commentText = typeof v.text === "string" ? v.text : "";
            const fromObj = v.from as Record<string, unknown> | undefined;
            const senderId = typeof fromObj?.id === "string" ? fromObj.id : null;
            const mediaObj = v.media as Record<string, unknown> | undefined;
            const mediaId =
              (typeof mediaObj?.id === "string" ? mediaObj.id : null) ??
              (typeof v.media_id === "string" ? v.media_id : null) ??
              (typeof v.original_media_id === "string" ? v.original_media_id : null);

            if (commentId && senderId) {
              console.log("[webhook] comment received", { igAccountId, commentId, mediaId, text: commentText?.slice(0, 50) });
              await triggerAutomation(supabase, igAccountId, senderId, commentText, "comment", { commentId, mediaId });
            }
          }
        }
      }
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Not allowed", { status: 405 });
});

type CommentPayload = { commentId: string; mediaId: string | null };

async function triggerAutomation(
  supabase: any,
  igBusinessId: string,
  senderId: string,
  text: string,
  type: "dm" | "comment",
  commentPayload?: CommentPayload
) {
  // Resolve Instagram business id (from Meta) to our account row UUID
  const { data: accountRow } = await supabase
    .from("instagram_accounts")
    .select("id, access_token, instagram_business_id")
    .eq("instagram_business_id", igBusinessId)
    .eq("is_active", true)
    .single();

  if (!accountRow) return;

  const accountUuid = accountRow.id;

  const { data: automations } = await supabase
    .from("automations")
    .select("id, user_id, trigger_keywords, config, flows(*)")
    .eq("instagram_account_id", accountUuid)
    .eq("trigger_type", type)
    .eq("is_active", true);

  if (!automations?.length) return;

  const commentId = commentPayload?.commentId ?? null;
  const mediaId = commentPayload?.mediaId ?? null;

  for (const automation of automations) {
    const rawKeywords = automation.trigger_keywords;
    const keywords = Array.isArray(rawKeywords) ? rawKeywords : [];
    const config = (automation.config as Record<string, unknown>) ?? {};

    // Keyword match: empty array = "any keyword" (match all)
    const isKeywordMatch =
      keywords.length === 0 ||
      keywords.some((kw: string) => text.toLowerCase().includes(String(kw).toLowerCase()));

    // For comments: optional post filter (Specific Post)
    const selectedPostId = (config.selectedPostId as string) ?? (config.selected_media_id as string) ?? null;
    const isPostMatch = !selectedPostId || (mediaId != null && String(selectedPostId) === String(mediaId));

    if (!isKeywordMatch || !isPostMatch) continue;

    const messageText = (config.message as string) ?? "";

    if (type === "comment" && commentId && String(messageText).trim()) {
      const sent = await sendPrivateReply(
        accountRow.instagram_business_id,
        accountRow.access_token,
        commentId,
        String(messageText).trim()
      );
      if (sent) {
        await supabase
          .from("analytics")
          .insert({
            user_id: automation.user_id ?? null,
            instagram_account_id: accountUuid,
            automation_id: automation.id,
            event_type: "message_sent",
          })
          .catch(() => {});
      }
      continue;
    }

    if (automation.flows?.[0]) {
      await executeFlow(supabase, automation.flows[0], senderId, commentId, accountUuid);
    }
  }
}

async function sendPrivateReply(igBusinessId: string, accessToken: string, commentId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igBusinessId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
      body: JSON.stringify({
        recipient: { comment_id: commentId },
        message: { text }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[webhook] Private reply failed:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[webhook] Private reply error:", e);
    return false;
  }
}

async function executeFlow(supabase: any, flow: any, senderId: string, commentId?: string, instagramAccountId?: string) {
  await supabase.from("analytics").insert({
    instagram_account_id: instagramAccountId ?? flow.instagram_account_id,
    automation_id: flow.automation_id,
    event_type: "automation_triggered"
  }).catch(() => {});

  const startNode = flow.nodes?.find((n: any) => n.type === "start");
  if (startNode) {
    // Flow execution can be extended here
  }
}
