-- Prevent duplicate auto-DMs: log each sent automation trigger so we skip repeats.
CREATE TABLE IF NOT EXISTS public.automation_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.automation_sent_log IS 'Idempotency: one auto-DM per (automation, comment) or per (automation, sender) within cooldown.';
COMMENT ON COLUMN public.automation_sent_log.trigger_type IS 'comment | dm_reminder | dm_content';
COMMENT ON COLUMN public.automation_sent_log.trigger_id IS 'comment_id for comment, instagram_sender_id for dm_*';

-- One send per comment per automation (comment_id is unique per comment).
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_sent_log_comment
  ON public.automation_sent_log (automation_id, trigger_id)
  WHERE trigger_type = 'comment';

-- One follow-reminder and one main-content send per (automation, sender) to prevent duplicate DMs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_sent_log_dm_reminder
  ON public.automation_sent_log (automation_id, trigger_id)
  WHERE trigger_type = 'dm_reminder';
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_sent_log_dm_content
  ON public.automation_sent_log (automation_id, trigger_id)
  WHERE trigger_type = 'dm_content';

-- Index for dm cooldown check (same sender + automation within last 24h).
CREATE INDEX IF NOT EXISTS idx_automation_sent_log_dm_lookup
  ON public.automation_sent_log (automation_id, trigger_id, created_at DESC)
  WHERE trigger_type = 'dm';

-- Only Edge Functions (service role) write this table; anon users have no access.
ALTER TABLE public.automation_sent_log ENABLE ROW LEVEL SECURITY;
