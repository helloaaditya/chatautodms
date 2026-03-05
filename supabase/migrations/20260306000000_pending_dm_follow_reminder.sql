-- Track whether we already sent "please follow first" so we send content only on second tap.
ALTER TABLE public.pending_dm_content
  ADD COLUMN IF NOT EXISTS follow_reminder_sent BOOLEAN DEFAULT FALSE;
