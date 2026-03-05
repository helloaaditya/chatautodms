-- How many times we've sent the "please follow" reminder. We keep sending reminder until this >= 2, then send content.
ALTER TABLE public.pending_dm_content
  ADD COLUMN IF NOT EXISTS reminder_sent_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.pending_dm_content.reminder_sent_count IS 'Number of times we sent the follow reminder. Content is sent only when reminder_sent_count >= 2 (reminder until they follow, then content).';
