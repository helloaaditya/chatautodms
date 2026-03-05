-- Add automation_id and source to message_logs for lead/conversation tracking
ALTER TABLE public.message_logs
  ADD COLUMN IF NOT EXISTS automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT; -- 'comment', 'dm'

COMMENT ON COLUMN public.message_logs.source IS 'How the message was triggered: comment (comment-to-DM) or dm';

-- Allow insert for own message_logs (e.g. from app); webhook uses service role
CREATE POLICY "Users can insert own message logs" ON public.message_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
