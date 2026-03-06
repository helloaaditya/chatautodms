-- How many times we've sent the "please follow" reminder. We keep sending reminder until this >= 2, then send content.
ALTER TABLE public.pending_dm_content
  ADD COLUMN IF NOT EXISTS reminder_sent_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.pending_dm_content.reminder_sent_count IS '0 = only got CTA from comment. 1 = ready for content on next tap. Content sent when reminder_sent_count >= 1 (2nd tap = main content).';
