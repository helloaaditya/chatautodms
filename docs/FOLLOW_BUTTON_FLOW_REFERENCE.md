# Follow Button Flow – Reference

## 1. Message flow logic

**Goal:** User comments → gets DM with “Visit profile” + “I'm following✅” → **1st tap** = CTA again (reminder), **2nd tap** = main content DM.

| Step | Event | System action |
|------|--------|----------------|
| 1 | User comments on post (keyword match) | Send opening message + **one** DM with buttons: “Visit profile” (URL), “I'm following✅” (postback `FOLLOW_CTA`). Create `pending_dm_content` with `reminder_sent_count = 0`. |
| 2 | **1st tap** on “I'm following✅” | If `pending_dm_content` exists and `reminder_sent_count < 1`: try insert `automation_sent_log(dm_reminder)`. If 23505 → CTA already sent (e.g. from comment); set `reminder_sent_count = 1`, return (no CTA). Else send CTA once, set `reminder_sent_count = 1`, return. |
| 3 | **2nd tap** on “I'm following✅” | If `pending_dm_content` exists and `reminder_sent_count >= 1`: insert `automation_sent_log` (dm_content) for dedup, send main content DM, delete pending row. |
| 4 | No pending row (e.g. lost) | **Fallback:** Find automation with `askToFollow` + message. If `dm_reminder` sent but not `dm_content`: upsert pending with `reminder_sent_count = 1` (next tap = content). If no reminder yet: send CTA, log `dm_reminder`, create pending with `reminder_sent_count = 1` (next tap = content). |

**Deduplication (stops CTA loop):**
- **CTA only once:** Insert `automation_sent_log(trigger_type='dm_reminder', trigger_id=senderId)` before sending the CTA. If 23505 (unique) → CTA was already sent; only set `pending.reminder_sent_count = 1` and return (no CTA again). Comment flow also inserts `dm_reminder` when sending the initial buttons.
- **Duplicate webhook POST:** Use `webhook_event_dedup.event_id = postback.mid` (or `message.mid`). Insert before processing; if 23505 skip.
- **Duplicate main content:** Insert `automation_sent_log(trigger_type='dm_content', trigger_id=senderId)` before sending; if 23505 skip.

---

## 2. Webhook handling update

**POST body (Instagram):** `object`, `entry[]` with `id`, `messaging[]` and/or `changes[]`.

**For each `entry.messaging` item:**
1. Skip if `message.is_echo`.
2. **Dedupe by event:** `event_id = postback.mid ?? message.mid`. Insert into `webhook_event_dedup(event_id)`. If unique violation → skip this event.
3. Resolve message text: `message.text ?? postback.payload ?? quick_reply.payload`.
4. If text is “Follow” CTA (see below) → handle in **DM / follow flow** (pending + fallback). Else → run normal automations (trigger_type dm/first_interaction).

**Follow CTA detection (normalized text):**
- `follow_cta` (payload)
- `follow now`, `i'm following✅`, `i'm following`, `im following`
- Or any of: `done`, `followed`, `yes`, `ok`, `follow`

---

## 3. Database schema

### `pending_dm_content`
Stores “main content” to send after user taps the follow button; one row per (account, sender).

| Column | Type | Purpose |
|--------|------|--------|
| id | UUID | PK |
| user_id | UUID | Owner |
| instagram_account_id | UUID | Our IG account |
| instagram_sender_id | TEXT | Instagram sender (recipient) |
| automation_id | UUID | Automation that created it |
| content_text | TEXT | Main message to send on 2nd tap |
| sender_full_name | TEXT | For “Hi {name}!” |
| sender_full_name | TEXT | From comment; used for “Hi {name}!” in content DM |
| follow_reminder_sent | BOOLEAN | Kept in sync when we send CTA |
| reminder_sent_count | INTEGER | 0 = only got CTA from comment; 1 = next tap delivers content |
| created_at | TIMESTAMPTZ | |
| UNIQUE(instagram_account_id, instagram_sender_id) | | One pending per account+sender |

### `automation_sent_log`
Idempotency: one send per (automation, trigger).

| Column | Type | Purpose |
|--------|------|--------|
| automation_id | UUID | |
| trigger_type | TEXT | `comment` \| `dm_reminder` \| `dm_content` |
| trigger_id | TEXT | comment_id or instagram_sender_id |
| created_at | TIMESTAMPTZ | |

Unique partial indexes: `(automation_id, trigger_id)` where `trigger_type = 'comment'`, `dm_reminder`, `dm_content`.

### `webhook_event_dedup`
Prevents processing the same Instagram event twice (duplicate POSTs).

| Column | Type | Purpose |
|--------|------|--------|
| event_id | TEXT PK | `postback.mid` or `message.mid` |
| created_at | TIMESTAMPTZ | |

---

## 4. Code for handling the button click event

### 4.1 Extract event in webhook loop (before triggerAutomation)

```ts
// Inside: for (const messageObj of entry.messaging)
if (messageObj.message?.is_echo) continue;
const senderId = messageObj.sender?.id;
if (!senderId) continue;

// Dedupe duplicate webhook deliveries
const eventId = messageObj.postback?.mid ?? messageObj.message?.mid;
if (eventId) {
  const { error: dedupeErr } = await supabase.from("webhook_event_dedup").insert({ event_id: eventId });
  if (dedupeErr?.code === "23505") {
    console.log("[webhook] skip duplicate delivery (already processed)", { eventId: eventId.slice(0, 40) + "…" });
    continue;
  }
}

const messageText = messageObj.message?.text ?? messageObj.postback?.payload ?? messageObj.message?.quick_reply?.payload;
if (messageText) {
  await triggerAutomation(supabase, igAccountId, senderId, messageText, "dm");
}
```

### 4.2 Treat as Follow CTA (payload / keywords)

```ts
const normalized = text.trim().toLowerCase();
const isFollowCta =
  normalized === "follow_cta" ||
  normalized === "follow now" ||
  normalized === "i'm following✅" ||
  normalized === "i'm following" ||
  normalized === "im following";
const doneKeywords = ["done", "followed", "yes", "ok", "follow"];
const isDone = isFollowCta || doneKeywords.some((kw) => normalized === kw || normalized.includes(kw));
if (!isDone) return; // not a follow button tap
```

### 4.3 Pending row path (has pending_dm_content)

```ts
const pending = /* select by instagram_account_id, instagram_sender_id */;
if (pending?.content_text) {
  const count = pending.reminder_sent_count ?? 0;
  const readyForContent = count >= 1;

  if (!readyForContent) {
    // 1st tap: send CTA again, set reminder_sent_count = 1
    await sendDmWithFollowButtons(..., reminderText, profileUsername);
    await supabase.from("pending_dm_content").update({ follow_reminder_sent: true, reminder_sent_count: 1 }).eq("id", pending.id);
    return;
  }

  // 2nd tap: send main content (with dedup)
  const { error: contentClaimErr } = await supabase.from("automation_sent_log").insert({
    automation_id: pending.automation_id,
    trigger_type: "dm_content",
    trigger_id: senderId,
  });
  if (contentClaimErr?.code === "23505") {
    await supabase.from("pending_dm_content").delete().eq("id", pending.id);
    return;
  }
  const thankYouMessage = name ? `Hi ${name}!\n\nThank you! Here's what you asked for:\n\n${pending.content_text}` : `Thank you!...`;
  await sendDmToUser(..., thankYouMessage);
  await supabase.from("pending_dm_content").delete().eq("id", pending.id);
  return;
}
```

### 4.4 Fallback (no pending row)

- Find automation: `askToFollow` and non-empty `message`.
- Query `automation_sent_log` for this automation + sender: `dm_reminder`, `dm_content`.
- If `hasContent` → skip (no duplicate).
- If `hasReminder` → upsert `pending_dm_content` with `reminder_sent_count: 1` (next tap = content).
- Else → send CTA via `sendDmWithFollowButtons`, insert `dm_reminder`, upsert pending with `reminder_sent_count: 1`.

### 4.5 Sending the CTA (Visit profile + I'm following)

```ts
// Button template (or fallback: text + quick_reply)
buttons: [
  { type: "web_url", url: "https://www.instagram.com/{account_name}/", title: "Visit profile" },
  { type: "postback", title: "I'm following✅", payload: "FOLLOW_CTA" },
];
```

Instagram sends `postback.payload === "FOLLOW_CTA"` (and optionally `postback.title === "I'm following✅"`) when the user taps the button. The webhook uses `messageText = message.text ?? postback.payload ?? quick_reply.payload`, so the handler receives `"FOLLOW_CTA"` for the button tap; normalization also accepts title variants (`i'm following`, `follow now`, etc.).
