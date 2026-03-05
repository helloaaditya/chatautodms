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

        // A. Handle Messaging (DMs) – text, quick_reply (button tap), or postback
        if (Array.isArray(entry.messaging)) {
          for (const messageObj of entry.messaging as Array<{ sender?: { id?: string }; message?: { text?: string; quick_reply?: { payload?: string }; is_echo?: boolean }; postback?: { payload?: string; title?: string } }>) {
            if (messageObj.message?.is_echo) continue;
            const senderId = messageObj.sender?.id;
            if (!senderId) continue;
            const postbackPayload = messageObj.postback?.payload;
            const quickReplyPayload = messageObj.message?.quick_reply?.payload;
            const messageText = messageObj.message?.text ?? postbackPayload ?? quickReplyPayload;
            if (messageText) {
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
              if (senderId === igAccountId) {
                continue;
              }
              const fromUsername = typeof fromObj?.username === "string" ? fromObj.username : null;
              const fromProfilePicture = typeof fromObj?.profile_picture === "string" ? fromObj.profile_picture : (typeof (fromObj as any)?.profile_picture_url === "string" ? (fromObj as any).profile_picture_url : null);
              const fromFullName = typeof fromObj?.name === "string" ? fromObj.name : (typeof (fromObj as any)?.full_name === "string" ? (fromObj as any).full_name : null);
              console.log("[webhook] comment received", { igAccountId, commentId, mediaId, text: commentText?.slice(0, 50) });
              await triggerAutomation(supabase, igAccountId, senderId, commentText, "comment", { commentId, mediaId, fromUsername, fromProfilePicture, fromFullName });
            }
          }
        }
      }
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  return new Response("Not allowed", { status: 405 });
});

type CommentPayload = { commentId: string; mediaId: string | null; fromUsername?: string | null; fromProfilePicture?: string | null; fromFullName?: string | null };

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

  if (type === "dm") {
    const normalized = text.trim().toLowerCase();
    const isFollowCta = normalized === "follow_cta" || normalized === "follow now";
    const doneKeywords = ["done", "followed", "yes", "ok", "follow"];
    const isDone = isFollowCta || doneKeywords.some((kw) => normalized === kw || normalized.includes(kw));
    if (isDone) {
      const { data: pendingList, error: pendingErr } = await supabase
        .from("pending_dm_content")
        .select("id, content_text, user_id, automation_id, sender_full_name")
        .eq("instagram_account_id", accountUuid)
        .eq("instagram_sender_id", senderId)
        .limit(1);
      if (pendingErr) {
        console.log("[webhook] pending_dm_content lookup error", { error: pendingErr.message, accountUuid, senderId });
      }
      const pending = Array.isArray(pendingList) ? pendingList[0] : null;
      if (pending?.content_text) {
        const name = (pending as { sender_full_name?: string | null }).sender_full_name?.trim();
        const thankYouMessage = name
          ? `Hi ${name}!\n\nThank you! Here's what you asked for:\n\n${pending.content_text}`
          : `Thank you! Here's what you asked for:\n\n${pending.content_text}`;
        console.log("[webhook] sending main content to user", { senderId, hasName: !!name });
        const sent = await sendDmToUser(accountRow.instagram_business_id, accountRow.access_token, senderId, thankYouMessage);
        if (sent) {
          await supabase.from("pending_dm_content").delete().eq("id", pending.id);
          try {
            await saveLeadAndConversation(supabase, {
              user_id: pending.user_id,
              instagram_account_id: accountUuid,
              instagram_business_id: accountRow.instagram_business_id,
              automation_id: pending.automation_id ?? undefined,
              sender_id: senderId,
              sender_username: null,
              sender_profile_picture: null,
              sender_full_name: name ?? null,
              incoming_text: text,
              outgoing_text: thankYouMessage,
              source: "dm",
            });
          } catch (_) {
            /* ignore */
          }
          console.log("[webhook] sent pending content after follow confirmation");
        } else {
          console.log("[webhook] sendDmToUser failed for content – user may not have messaged within 24h or API error");
        }
        return;
      }
      if (isFollowCta || isDone) {
        console.log("[webhook] no pending_dm_content for sender, trying fallback from automation", { senderId, accountUuid });
        const { data: fallbackAuto } = await supabase
          .from("automations")
          .select("id, user_id, config")
          .eq("instagram_account_id", accountUuid)
          .eq("trigger_type", "comment")
          .eq("is_active", true)
          .limit(5);
        const withAskAndMessage = Array.isArray(fallbackAuto) ? fallbackAuto.find((a: { config?: Record<string, unknown> }) => {
          const c = a.config as Record<string, unknown> | null;
          return c && !!c.askToFollow && String(c.message ?? "").trim();
        }) : null;
        if (withAskAndMessage?.config && typeof (withAskAndMessage.config as Record<string, unknown>).message === "string") {
          const content = String((withAskAndMessage.config as Record<string, unknown>).message).trim();
          const thankYouMessage = `Thank you! Here's what you asked for:\n\n${content}`;
          const sent = await sendDmToUser(accountRow.instagram_business_id, accountRow.access_token, senderId, thankYouMessage);
          if (sent) {
            console.log("[webhook] sent main content via fallback (no pending row)");
          }
        }
      }
    }
  }

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
    const openingMessageText = (config.openingMessageText as string) ?? "";
    const publicReplyText = (config.publicReplyText as string) ?? "";
    const askToFollowText = (config.askToFollowText as string) ?? "";
    const followUpMessage = (config.followUpMessage as string) ?? "";
    const publicReply = !!config.publicReply;
    const askToFollow = !!config.askToFollow;
    const openingMessage = !!config.openingMessage;
    const followUp = !!config.followUp;

    if (type === "comment" && commentId) {
      if (!String(messageText).trim()) {
        console.log("[webhook] skip automation (no message in config)", { automationId: automation.id });
        continue;
      }
      if (publicReply && String(publicReplyText).trim()) {
        try {
          await postPublicReply(commentId, String(publicReplyText).trim(), accountRow.access_token);
          console.log("[webhook] public reply sent");
        } catch (e) {
          console.error("[webhook] public reply failed", e);
        }
      }
      if (askToFollow) {
        const followRequestParts: string[] = [];
        if (openingMessage && openingMessageText.trim()) followRequestParts.push(openingMessageText.trim());
        if (askToFollowText.trim()) followRequestParts.push(askToFollowText.trim());
        followRequestParts.push("Hit the button below to get the content.");
        const followRequestText = followRequestParts.join("\n\n");
        console.log("[webhook] sending follow request (ask to follow)", { automationId: automation.id, commentId });
        const sent = await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, followRequestText);
        if (sent) {
          try {
            await supabase.from("pending_dm_content").upsert(
              {
                user_id: automation.user_id,
                instagram_account_id: accountUuid,
                instagram_sender_id: senderId,
                automation_id: automation.id,
                content_text: String(messageText).trim(),
                sender_full_name: commentPayload?.fromFullName ?? null,
              },
              { onConflict: "instagram_account_id,instagram_sender_id" }
            );
          } catch (_) {
            /* ignore */
          }
          try {
            await sendDmWithQuickReply(accountRow.instagram_business_id, accountRow.access_token, senderId, "Tap the button below:", [{ title: "Follow now", payload: "FOLLOW_CTA" }]);
            console.log("[webhook] Follow now button sent");
          } catch (_) {
            /* ignore */
          }
          if (followUp && String(followUpMessage).trim()) {
            try {
              await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, String(followUpMessage).trim());
              console.log("[webhook] follow-up (reminder) sent");
            } catch (_) {
              /* ignore */
            }
          }
          try {
            await supabase.from("analytics").insert({
              user_id: automation.user_id ?? null,
              instagram_account_id: accountUuid,
              automation_id: automation.id,
              event_type: "message_sent",
            });
          } catch (_) {
            /* ignore */
          }
          try {
            await saveLeadAndConversation(supabase, {
              user_id: automation.user_id,
              instagram_account_id: accountUuid,
              instagram_business_id: accountRow.instagram_business_id,
              automation_id: automation.id,
              sender_id: senderId,
              sender_username: commentPayload?.fromUsername ?? null,
              sender_profile_picture: commentPayload?.fromProfilePicture ?? null,
              sender_full_name: commentPayload?.fromFullName ?? null,
              incoming_text: text,
              outgoing_text: followRequestText,
              source: "comment",
            });
          } catch (_) {
            /* ignore */
          }
        }
        continue;
      }
      const parts: string[] = [];
      if (openingMessage && openingMessageText.trim()) parts.push(openingMessageText.trim());
      parts.push(String(messageText).trim());
      const mainDmText = parts.join("\n\n");
      console.log("[webhook] sending private reply", { automationId: automation.id, commentId });
      const sent = await sendPrivateReply(
        accountRow.instagram_business_id,
        accountRow.access_token,
        commentId,
        mainDmText
      );
      if (sent) {
        console.log("[webhook] private reply sent");
        if (followUp && String(followUpMessage).trim()) {
          try {
            await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, String(followUpMessage).trim());
            console.log("[webhook] follow-up message sent");
          } catch (_) {
            /* ignore */
          }
        }
        try {
          await supabase.from("analytics").insert({
            user_id: automation.user_id ?? null,
            instagram_account_id: accountUuid,
            automation_id: automation.id,
            event_type: "message_sent",
          });
        } catch (_) {
          /* ignore analytics insert errors */
        }
        try {
          await saveLeadAndConversation(supabase, {
            user_id: automation.user_id,
            instagram_account_id: accountUuid,
            instagram_business_id: accountRow.instagram_business_id,
            automation_id: automation.id,
            sender_id: senderId,
            sender_username: commentPayload?.fromUsername ?? null,
            sender_profile_picture: commentPayload?.fromProfilePicture ?? null,
            sender_full_name: commentPayload?.fromFullName ?? null,
            incoming_text: text,
            outgoing_text: mainDmText,
            source: "comment",
          });
        } catch (_) {
          /* ignore */
        }
      }
      continue;
    }

    if (automation.flows?.[0]) {
      await executeFlow(supabase, automation.flows[0], senderId, commentId ?? undefined, accountUuid);
    }
  }
  } catch (e) {
    console.error("[webhook] triggerAutomation error", e);
  }
}

type LeadConversationPayload = {
  user_id: string;
  instagram_account_id: string;
  instagram_business_id: string;
  automation_id?: string | null;
  sender_id: string;
  sender_username: string | null;
  sender_profile_picture?: string | null;
  sender_full_name?: string | null;
  incoming_text: string;
  outgoing_text: string;
  source: "comment" | "dm";
};

async function saveLeadAndConversation(supabase: any, p: LeadConversationPayload): Promise<void> {
  await supabase.from("leads").upsert(
    {
      user_id: p.user_id,
      instagram_account_id: p.instagram_account_id,
      instagram_user_id: p.sender_id,
      username: p.sender_username ?? undefined,
      full_name: p.sender_full_name ?? undefined,
      profile_picture: p.sender_profile_picture ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,instagram_user_id", ignoreDuplicates: false }
  );
  await supabase.from("message_logs").insert([
    {
      user_id: p.user_id,
      instagram_account_id: p.instagram_account_id,
      automation_id: p.automation_id,
      sender_id: p.sender_id,
      receiver_id: p.instagram_business_id,
      message_text: p.incoming_text,
      message_type: "incoming",
      status: "received",
      source: p.source,
    },
    {
      user_id: p.user_id,
      instagram_account_id: p.instagram_account_id,
      automation_id: p.automation_id,
      sender_id: p.instagram_business_id,
      receiver_id: p.sender_id,
      message_text: p.outgoing_text,
      message_type: "outgoing",
      status: "sent",
      source: p.source,
    },
  ]);
}

async function sendDmWithQuickReply(
  igBusinessId: string,
  accessToken: string,
  recipientUserId: string,
  text: string,
  quickReplies: Array<{ title: string; payload: string }>
): Promise<boolean> {
  const url = (host: string) => `${host}/v21.0/${igBusinessId}/messages`;
  const message: { text: string; quick_replies?: Array<{ content_type: string; title: string; payload: string }> } = { text };
  if (quickReplies.length) {
    message.quick_replies = quickReplies.map((q) => ({ content_type: "text", title: q.title, payload: q.payload }));
  }
  const body = JSON.stringify({ recipient: { id: recipientUserId }, message });
  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body
  };
  try {
    let res = await fetch(url("https://graph.instagram.com"), opts);
    if (!res.ok && res.status >= 400) {
      res = await fetch(url("https://graph.facebook.com"), opts);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[webhook] sendDmWithQuickReply failed:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[webhook] sendDmWithQuickReply error:", e);
    return false;
  }
}

async function sendDmToUser(igBusinessId: string, accessToken: string, recipientUserId: string, text: string): Promise<boolean> {
  const url = (host: string) => `${host}/v21.0/${igBusinessId}/messages`;
  const body = JSON.stringify({
    recipient: { id: recipientUserId },
    message: { text }
  });
  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body
  };
  try {
    let res = await fetch(url("https://graph.instagram.com"), opts);
    if (!res.ok && res.status >= 400) {
      res = await fetch(url("https://graph.facebook.com"), opts);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[webhook] sendDmToUser failed:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[webhook] sendDmToUser error:", e);
    return false;
  }
}

async function postPublicReply(commentId: string, message: string, accessToken: string): Promise<void> {
  const url = `https://graph.instagram.com/v21.0/${commentId}/replies?message=${encodeURIComponent(message)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Public reply failed: ${res.status}`);
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
  try {
    await supabase.from("analytics").insert({
      instagram_account_id: instagramAccountId ?? flow.instagram_account_id,
      automation_id: flow.automation_id,
      event_type: "automation_triggered"
    });
  } catch (_) {
    /* ignore */
  }
  const startNode = flow.nodes?.find((n: any) => n.type === "start");
  if (startNode) {
    // Flow execution can be extended here
  }
}
