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

    if (mode === "subscribe") {
      if (!WEBHOOK_VERIFY_TOKEN) {
        console.error("[webhook] WEBHOOK_VERIFY_TOKEN secret is not set in Supabase.");
        return new Response("Verification failed: token not configured", { status: 503 });
      }
      if (token === WEBHOOK_VERIFY_TOKEN && challenge) {
        return new Response(challenge, { status: 200 });
      }
      console.error("[webhook] Verification failed: token mismatch.");
      return new Response("Verification failed", { status: 403 });
    }

    return new Response(
      "Instagram webhook endpoint. Verification only runs when Meta sends the request.",
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

    // Log full payload for debugging
    console.log("[webhook] payload object:", obj, "hasEntry:", hasEntry);
    console.log("[webhook] full payload:", JSON.stringify(body).slice(0, 1000));

    // Accept both "instagram" and "page" — Meta sometimes sends "page" for IG-connected pages
    const isValidObject = obj === "instagram" || obj === "page";

    if (!isValidObject || !hasEntry) {
      console.log("[webhook] Ignoring payload – unrecognised object type or no entries:", obj);
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    for (const entry of body.entry as Array<Record<string, unknown>>) {
        const igAccountId = entry.id as string;
        if (!igAccountId) {
          console.log("[webhook] entry has no id, skipping", JSON.stringify(entry).slice(0, 200));
          continue;
        }
        console.log("[webhook] processing entry", { igAccountId, messagingCount: Array.isArray(entry.messaging) ? (entry.messaging as unknown[]).length : 0, changesCount: Array.isArray(entry.changes) ? (entry.changes as unknown[]).length : 0 });

        // A. Handle Messaging (DMs)
        if (Array.isArray(entry.messaging)) {
          for (const messageObj of entry.messaging as Array<{ sender?: { id?: string }; message?: { text?: string; mid?: string; quick_reply?: { payload?: string }; is_echo?: boolean }; postback?: { payload?: string; title?: string; mid?: string } }>) {
            if (messageObj.message?.is_echo) continue;
            const senderId = messageObj.sender?.id;
            if (!senderId) continue;
            const eventId = (messageObj.postback as { mid?: string } | undefined)?.mid ?? (messageObj.message as { mid?: string } | undefined)?.mid;
            if (eventId) {
              const { error: dedupeErr } = await supabase.from("webhook_event_dedup").insert({ event_id: eventId });
              if (dedupeErr?.code === "23505") {
                console.log("[webhook] skip duplicate delivery (already processed)", { eventId: eventId.slice(0, 40) + "…" });
                continue;
              }
            }
            const postbackPayload = messageObj.postback?.payload;
            const quickReplyPayload = messageObj.message?.quick_reply?.payload;
            const messageText = (messageObj.message?.text ?? postbackPayload ?? quickReplyPayload ?? "").trim();
            if (!messageText) continue;
            console.log("[webhook] DM received", { senderId, messageText: messageText.slice(0, 80), hasPostback: !!postbackPayload, hasQuickReply: !!quickReplyPayload });
            await triggerAutomation(supabase, igAccountId, senderId, messageText, "dm");
          }
        }

        // B. Handle Changes (Comments)
        if (Array.isArray(entry.changes)) {
          for (const change of entry.changes as Array<{ field?: string; value?: Record<string, unknown> }>) {
            if (change.field !== "comments" || !change.value) continue;
            const v = change.value as Record<string, unknown>;
            const commentId = typeof v.id === "string" ? v.id : null;
            const commentText = typeof v.text === "string" ? v.text : "";
            const fromObj = v.from as Record<string, unknown> | undefined;
            const senderId = typeof fromObj?.id === "string" ? fromObj.id : null;
            const mediaObj = v.media as Record<string, unknown> | undefined;
            const rawMediaId = mediaObj?.id ?? v.media_id ?? v.original_media_id ?? null;
            const mediaId = rawMediaId != null ? String(rawMediaId).trim() || null : null;

            if (commentId && senderId) {
              if (senderId === igAccountId) continue;
              const fromUsername = typeof fromObj?.username === "string" ? fromObj.username : null;
              const fromProfilePicture = typeof fromObj?.profile_picture === "string" ? fromObj.profile_picture : (typeof (fromObj as any)?.profile_picture_url === "string" ? (fromObj as any).profile_picture_url : null);
              const fromFullName = typeof fromObj?.name === "string" ? fromObj.name : (typeof (fromObj as any)?.full_name === "string" ? (fromObj as any).full_name : null);
              console.log("[webhook] comment received", { igAccountId, commentId, mediaId, text: commentText?.slice(0, 50) });
              await triggerAutomation(supabase, igAccountId, senderId, commentText, "comment", { commentId, mediaId, fromUsername, fromProfilePicture, fromFullName });
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
    // Resolve Instagram business id to our account row UUID
    const { data: accountRows, error: accountError } = await supabase
      .from("instagram_accounts")
      .select("id, access_token, instagram_business_id, account_name")
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

      // Detect "I'm following" button taps (postback payload or quick reply)
      const isFollowCta =
        normalized === "follow_cta" ||
        normalized === "follow now" ||
        normalized === "i'm following✅" ||
        normalized === "i'm following" ||
        normalized === "im following";

      const doneKeywords = ["done", "followed", "yes", "ok", "follow"];
      const isDone =
        isFollowCta ||
        doneKeywords.some((kw) => normalized === kw || normalized.includes(kw));

      if (isDone) {
        // Look up pending content for this sender
        const { data: pendingList, error: pendingErr } = await supabase
          .from("pending_dm_content")
          .select("id, content_text, user_id, automation_id, sender_full_name, follow_reminder_sent, reminder_sent_count, created_at")
          .eq("instagram_account_id", accountUuid)
          .eq("instagram_sender_id", senderId)
          .limit(1);

        if (pendingErr) {
          console.log("[webhook] pending_dm_content lookup error", { error: pendingErr.message, accountUuid, senderId });
        }

        const pending = Array.isArray(pendingList) ? pendingList[0] : null;

        if (pending?.content_text) {
          // Send main content on every tap. Same tap deduped by webhook_event_dedup (mid). If they request again (new tap) = send again.
          const name = (pending as { sender_full_name?: string | null }).sender_full_name?.trim();
          const thankYouMessage = name
            ? `Hi ${name}!\n\nThank you! Here's what you asked for:\n\n${pending.content_text}`
            : `Thank you! Here's what you asked for:\n\n${pending.content_text}`;

          console.log("[webhook] sending main content (tap I'm following)", { senderId, hasName: !!name });
          const sent = await sendDmToUser(accountRow.instagram_business_id, accountRow.access_token, senderId, thankYouMessage);

          if (sent) {
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
            } catch (_) { /* ignore */ }
            console.log("[webhook] ✅ content delivered (can tap again to receive again)");
          } else {
            console.log("[webhook] sendDmToUser failed (24h window?) — content not sent", { senderId });
          }
          return;
        }

        // No pending row found — try fallback from active automations
        if (isFollowCta || isDone) {
          console.log("[webhook] no pending_dm_content for sender, trying fallback from automation", { senderId, accountUuid });
          const { data: fallbackAuto, error: fallbackErr } = await supabase
            .from("automations")
            .select("id, user_id, config, trigger_type")
            .eq("instagram_account_id", accountUuid)
            .eq("is_active", true)
            .limit(10);

          if (fallbackErr) {
            console.log("[webhook] fallback automations fetch error", { error: fallbackErr.message });
          }

          const withAskAndMessage = Array.isArray(fallbackAuto)
            ? fallbackAuto.find((a: { config?: Record<string, unknown> }) => {
                const c = a.config as Record<string, unknown> | null;
                return c && !!c.askToFollow && String(c.message ?? "").trim();
              })
            : null;

          if (!withAskAndMessage) {
            console.log("[webhook] fallback: no automation with askToFollow+message found");
          }

          const contentStr = withAskAndMessage?.config && (withAskAndMessage.config as Record<string, unknown>).message != null
            ? String((withAskAndMessage.config as Record<string, unknown>).message).trim()
            : "";

          if (withAskAndMessage?.config && contentStr) {
            const automationId = (withAskAndMessage as { id: string }).id;
            console.log("[webhook] fallback: send content (if requesting again, send again)", { automationId, senderId });

            const thankYouMessage = `Thank you! Here's what you asked for:\n\n${contentStr}`;
            const sent = await sendDmToUser(accountRow.instagram_business_id, accountRow.access_token, senderId, thankYouMessage);
            if (sent) {
              try {
                await saveLeadAndConversation(supabase, {
                  user_id: (withAskAndMessage as { user_id: string }).user_id,
                  instagram_account_id: accountUuid,
                  instagram_business_id: accountRow.instagram_business_id,
                  automation_id: automationId,
                  sender_id: senderId,
                  sender_username: null,
                  sender_profile_picture: null,
                  sender_full_name: null,
                  incoming_text: text,
                  outgoing_text: thankYouMessage,
                  source: "dm",
                });
              } catch (_) { /* ignore */ }
              console.log("[webhook] fallback: ✅ content sent");
            }
          }
        }
        // ✅ isDone path fully handled — do NOT fall through to automations query
        return;
      }
    }

    const triggerTypes = type === "dm" ? ["dm", "first_interaction"] : [type];
    const { data: automations, error: autoError } = await supabase
      .from("automations")
      .select("id, user_id, trigger_keywords, config, trigger_type, flows(*)")
      .eq("instagram_account_id", accountUuid)
      .in("trigger_type", triggerTypes)
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

      // Keyword match: empty array = match all
      const isKeywordMatch =
        keywords.length === 0 ||
        keywords.some((kw: string) => text.toLowerCase().includes(String(kw).toLowerCase()));

      // For comments: optional post filter
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

        const { data: _claimRow, error: claimErr } = await supabase
          .from("automation_sent_log")
          .insert({ automation_id: automation.id, trigger_type: "comment", trigger_id: commentId })
          .select("id")
          .single();

        if (claimErr) {
          if (claimErr.code === "23505") {
            console.log("[webhook] skip automation (already sent for this comment)", { automationId: automation.id, commentId });
            continue;
          }
          console.warn("[webhook] automation_sent_log insert error", claimErr.code, claimErr.message);
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

        // Follow CTA is a premium feature — free tier gets main content directly (sync with src/lib/subscription.ts)
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", automation.user_id)
          .single();
        const rawTier = (profileRow?.subscription_tier ?? "free") as string;
        const legacyMap: Record<string, string> = { starter: "premium", pro: "premium", agency: "ultra_premium" };
        const tier = rawTier === "premium" || rawTier === "ultra_premium" ? rawTier : (legacyMap[rawTier] ?? "free");
        const canUseFollowCta = tier === "premium" || tier === "ultra_premium";

        if (askToFollow && canUseFollowCta) {
          const followRequestParts: string[] = [];
          if (openingMessage && openingMessageText.trim()) followRequestParts.push(openingMessageText.trim());
          if (askToFollowText.trim()) followRequestParts.push(askToFollowText.trim());
          followRequestParts.push("Hit the button below to get the content.");
          const followRequestText = followRequestParts.join("\n\n");

          console.log("[webhook] sending follow request (ask to follow)", { automationId: automation.id, commentId });
          const sent = await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, followRequestText);

          if (sent) {
            // Store pending content for when user confirms follow
            try {
              await supabase.from("pending_dm_content").upsert(
                {
                  user_id: automation.user_id,
                  instagram_account_id: accountUuid,
                  instagram_sender_id: senderId,
                  automation_id: automation.id,
                  content_text: String(messageText).trim(),
                  sender_full_name: commentPayload?.fromFullName ?? null,
                  follow_reminder_sent: false,
                  reminder_sent_count: 0,
                },
                { onConflict: "instagram_account_id,instagram_sender_id" }
              );
            } catch (_) { /* ignore */ }

            // Also send follow buttons via DM
            try {
              const profileUsername = (accountRow as { account_name?: string | null }).account_name ?? null;
              const btnText = "Tap Visit profile to open our page and follow us, then tap I'm following✅ to get the content.";
              const buttonsSent = await sendDmWithFollowButtons(
                accountRow.instagram_business_id,
                accountRow.access_token,
                senderId,
                btnText,
                profileUsername
              );
              if (buttonsSent) {
                await supabase
                  .from("pending_dm_content")
                  .update({ follow_reminder_sent: true, reminder_sent_count: 0 })
                  .eq("instagram_account_id", accountUuid)
                  .eq("instagram_sender_id", senderId);
              }
              console.log("[webhook] CTA sent once (from comment). Tap I'm following = main content only.");
            } catch (_) { /* ignore */ }

            if (followUp && String(followUpMessage).trim()) {
              try {
                await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, String(followUpMessage).trim());
                console.log("[webhook] follow-up sent");
              } catch (_) { /* ignore */ }
            }

            try {
              await supabase.from("analytics").insert({
                user_id: automation.user_id ?? null,
                instagram_account_id: accountUuid,
                automation_id: automation.id,
                event_type: "message_sent",
              });
            } catch (_) { /* ignore */ }

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
            } catch (_) { /* ignore */ }
          }
          continue;
        }

        // No askToFollow — send content directly via private reply
        const parts: string[] = [];
        if (openingMessage && openingMessageText.trim()) parts.push(openingMessageText.trim());
        parts.push(String(messageText).trim());
        const mainDmText = parts.join("\n\n");

        console.log("[webhook] sending private reply (no follow gate)", { automationId: automation.id, commentId });
        const sent = await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, mainDmText);

        if (sent) {
          console.log("[webhook] private reply sent");
          if (followUp && String(followUpMessage).trim()) {
            try {
              await sendPrivateReply(accountRow.instagram_business_id, accountRow.access_token, commentId, String(followUpMessage).trim());
              console.log("[webhook] follow-up message sent");
            } catch (_) { /* ignore */ }
          }

          try {
            await supabase.from("analytics").insert({
              user_id: automation.user_id ?? null,
              instagram_account_id: accountUuid,
              automation_id: automation.id,
              event_type: "message_sent",
            });
          } catch (_) { /* ignore */ }

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
          } catch (_) { /* ignore */ }
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
    message.quick_replies = quickReplies.map((q) => ({
      content_type: "text",
      title: q.title,
      payload: q.payload,
    }));
  }
  const body = JSON.stringify({ recipient: { id: recipientUserId }, message });
  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body,
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

/** Sends follow reminder with "Visit profile" (URL) + "I'm following✅" (postback) buttons. */
async function sendDmWithFollowButtons(
  igBusinessId: string,
  accessToken: string,
  recipientUserId: string,
  reminderText: string,
  profileUsername: string | null
): Promise<boolean> {
  const profileUrl = profileUsername
    ? `https://www.instagram.com/${encodeURIComponent(profileUsername.replace(/\s+/g, ""))}/`
    : null;
  const url = (host: string) => `${host}/v21.0/${igBusinessId}/messages`;

  const buttons: Array<{ type: string; url?: string; title: string; payload?: string }> = [];
  if (profileUrl) {
    buttons.push({ type: "web_url", url: profileUrl, title: "Visit profile" });
  }
  buttons.push({ type: "postback", title: "I'm following✅", payload: "FOLLOW_CTA" });

  const templateBody = JSON.stringify({
    recipient: { id: recipientUserId },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: reminderText,
          buttons,
        },
      },
    },
  });

  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: templateBody,
  };

  try {
    let res = await fetch(url("https://graph.instagram.com"), opts);
    if (!res.ok && res.status >= 400) {
      res = await fetch(url("https://graph.facebook.com"), opts);
    }
    if (res.ok) return true;
    const err = await res.json().catch(() => ({}));
    console.warn("[webhook] sendDmWithFollowButtons template failed, falling back to quick reply", res.status, (err as { error?: { message?: string } })?.error?.message);
  } catch (e) {
    console.warn("[webhook] sendDmWithFollowButtons error, falling back", e);
  }

  // Fallback: plain text with link + quick reply button
  const textWithLink = profileUrl
    ? `${reminderText}\n\nOpen our profile: ${profileUrl}`
    : reminderText;
  return sendDmWithQuickReply(igBusinessId, accessToken, recipientUserId, textWithLink, [
    { title: "I'm following✅", payload: "FOLLOW_CTA" },
  ]);
}

async function sendDmToUser(
  igBusinessId: string,
  accessToken: string,
  recipientUserId: string,
  text: string
): Promise<boolean> {
  const url = (host: string) => `${host}/v21.0/${igBusinessId}/messages`;
  const body = JSON.stringify({
    recipient: { id: recipientUserId },
    message: { text },
  });
  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body,
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

async function sendPrivateReply(
  igBusinessId: string,
  accessToken: string,
  commentId: string,
  text: string
): Promise<boolean> {
  const url = (host: string) => `${host}/v21.0/${igBusinessId}/messages`;
  const body = JSON.stringify({
    recipient: { comment_id: commentId },
    message: { text },
  });
  const opts = {
    method: "POST" as const,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body,
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

async function executeFlow(
  supabase: any,
  flow: any,
  senderId: string,
  commentId?: string,
  instagramAccountId?: string
) {
  try {
    await supabase.from("analytics").insert({
      instagram_account_id: instagramAccountId ?? flow.instagram_account_id,
      automation_id: flow.automation_id,
      event_type: "automation_triggered",
    });
  } catch (_) { /* ignore */ }

  const startNode = flow.nodes?.find((n: any) => n.type === "start");
  if (startNode) {
    // Flow execution can be extended here
  }
}