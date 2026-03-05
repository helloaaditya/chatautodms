import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const WEBHOOK_VERIFY_TOKEN = (Deno.env.get("WEBHOOK_VERIFY_TOKEN") ?? "").trim();

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // 1. WEBHOOK VERIFICATION (GET request from Meta)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = (url.searchParams.get("hub.verify_token") ?? "").trim();
    const challenge = url.searchParams.get("hub.challenge");

    // Meta sends hub.mode=subscribe, hub.verify_token=..., hub.challenge=... when you click "Verify and save"
    if (mode === "subscribe") {
      if (!WEBHOOK_VERIFY_TOKEN) {
        console.error("[webhook] WEBHOOK_VERIFY_TOKEN secret is not set in Supabase.");
        return new Response("Verification failed: token not configured", { status: 503 });
      }
      if (token === WEBHOOK_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200 });
      }
      console.error("[webhook] Verification failed: token mismatch. In Supabase set WEBHOOK_VERIFY_TOKEN to the exact value you entered in Meta's Verify token field.");
      return new Response("Verification failed", { status: 403 });
    }

    // Browser or other GET with no hub params – don't return 403
    return new Response(
      "Instagram webhook endpoint. Verification only runs when Meta sends the request (use Verify and save in Meta App Dashboard → Instagram → Webhooks).",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  // 2. WEBHOOK PROCESSING (POST request from Meta)
  if (req.method === "POST") {
    console.log("[webhook] POST received – Instagram webhook hit");
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad body", { status: 400 });
    }
    const obj = body.object;
    const hasEntry = Array.isArray(body.entry);
    if (obj !== "instagram" || !hasEntry) {
      console.log("[webhook] Ignoring payload – object:", obj, "entries:", hasEntry ? body.entry?.length : 0);
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
            const rawMediaId =
              mediaObj?.id ?? v.media_id ?? v.original_media_id ?? null;
            const mediaId = rawMediaId != null ? String(rawMediaId).trim() || null : null;

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
  console.log("[webhook] triggerAutomation start", { igBusinessId, type });
  try {
  // Resolve Instagram business id (from Meta) to our account row UUID (use limit(1) to avoid .single() error when 0 or 2+ rows)
  const { data: accountRows, error: accountError } = await supabase
    .from("instagram_accounts")
    .select("id, access_token, instagram_business_id")
    .eq("instagram_business_id", igBusinessId)
    .eq("is_active", true)
    .limit(1);

  if (accountError) {
    console.log("[webhook] account lookup error", { igBusinessId, error: accountError.message });
    return;
  }
  const accountRow = Array.isArray(accountRows) ? accountRows[0] : null;
  if (!accountRow) {
    console.log("[webhook] no account found for ig id", igBusinessId);
    return;
  }

  const accountUuid = accountRow.id;
  console.log("[webhook] account resolved", { accountUuid, type });

  const { data: automations, error: autoError } = await supabase
    .from("automations")
    .select("id, user_id, trigger_keywords, config, flows(*)")
    .eq("instagram_account_id", accountUuid)
    .eq("trigger_type", type)
    .eq("is_active", true);

  if (autoError) {
    console.log("[webhook] automations fetch error", { error: autoError.message });
    return;
  }
  if (!automations?.length) {
    console.log("[webhook] no automations for this account", { accountUuid, type });
    return;
  }
  console.log("[webhook] automations to check", automations.length);

  const commentId = commentPayload?.commentId ?? null;
  const mediaId = commentPayload?.mediaId ?? null;

  for (const automation of automations) {
    const rawKeywords = automation.trigger_keywords;
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords
      : typeof rawKeywords === "string"
        ? [rawKeywords]
        : [];
    const config = (automation.config as Record<string, unknown>) ?? {};

    // Keyword match: empty array = "any keyword" (match all)
    const isKeywordMatch =
      keywords.length === 0 ||
      keywords.some((kw: string) => text.toLowerCase().includes(String(kw).toLowerCase()));

    // For comments: optional post filter (Specific Post) – normalize IDs for comparison
    const rawSelected = (config.selectedPostId as string) ?? (config.selected_media_id as string) ?? null;
    const selectedPostId = rawSelected ? String(rawSelected).trim() : null;
    const normMediaId = mediaId != null ? String(mediaId).trim() : null;
    const isPostMatch =
      !selectedPostId ||
      (normMediaId != null && selectedPostId === normMediaId);

    if (!isKeywordMatch) {
      console.log("[webhook] skip automation (keyword mismatch)", { automationId: automation.id, text: text?.slice(0, 30), keywords });
      continue;
    }
    if (!isPostMatch) {
      console.log("[webhook] skip automation (post mismatch)", { automationId: automation.id, selectedPostId, mediaId: normMediaId });
      continue;
    }

    const messageText = (config.message as string) ?? "";

    if (type === "comment" && commentId) {
      if (!String(messageText).trim()) {
        console.log("[webhook] skip automation (no message in config)", { automationId: automation.id });
        continue;
      }
      console.log("[webhook] sending private reply", { automationId: automation.id, commentId });
      const sent = await sendPrivateReply(
        accountRow.instagram_business_id,
        accountRow.access_token,
        commentId,
        String(messageText).trim()
      );
      if (sent) {
        console.log("[webhook] private reply sent");
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
  } catch (e) {
    console.error("[webhook] triggerAutomation error", e);
  }
}

async function sendPrivateReply(igBusinessId: string, accessToken: string, commentId: string, text: string): Promise<boolean> {
  const url = (host: string) => `${host}/v21.0/${igBusinessId}/messages`;
  const body = JSON.stringify({
    recipient: { comment_id: commentId },
    message: { text }
  });
  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body
  };

  const tryHost = async (host: string): Promise<{ ok: boolean; status: number; err?: unknown }> => {
    const res = await fetch(url(host), opts);
    const err = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, err };
    return { ok: true, status: res.status };
  };

  try {
    let result = await tryHost("https://graph.instagram.com");
    if (!result.ok && result.err && String((result.err as any)?.error?.message || "").includes("method type")) {
      console.log("[webhook] retrying private reply on graph.facebook.com");
      result = await tryHost("https://graph.facebook.com");
    }
    if (!result.ok) {
      console.error("[webhook] Private reply failed:", result.status, result.err);
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
