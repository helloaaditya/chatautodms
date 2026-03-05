-- Prevent duplicate auto-DMs: log each sent automation trigger so we skip repeats.
CREATE TABLE IF NOT EXISTS public.automation_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.automation_sent_log IS 'Idempotency: one auto-DM per (automation, comment) or per (automation, sender) within cooldown.';
COMMENT ON COLUMN public.automation_sent_log.trigger_type IS 'comment | dm';
COMMENT ON COLUMN public.automation_sent_log.trigger_id IS 'comment_id for comment trigger, instagram_sender_id for dm trigger';

-- One send per comment per automation (comment_id is unique per comment).
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_sent_log_comment
  ON public.automation_sent_log (automation_id, trigger_id)
  WHERE trigger_type = 'comment';

-- Index for dm cooldown check (same sender + automation within last 24h).
CREATE INDEX IF NOT EXISTS idx_automation_sent_log_dm_lookup
  ON public.automation_sent_log (automation_id, trigger_id, created_at DESC)
  WHERE trigger_type = 'dm';

-- Only Edge Functions (service role) write this table; anon users have no access.
ALTER TABLE public.automation_sent_log ENABLE ROW LEVEL SECURITY;
