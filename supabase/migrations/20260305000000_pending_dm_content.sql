-- When "Ask to follow" is on, we send a "follow now" DM and store the main content here.
-- When the user replies "done" or "followed" in DMs, we send this content and clear the row.
CREATE TABLE IF NOT EXISTS public.pending_dm_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instagram_account_id UUID NOT NULL REFERENCES public.instagram_accounts(id) ON DELETE CASCADE,
  instagram_sender_id TEXT NOT NULL,
  automation_id UUID REFERENCES public.automations(id) ON DELETE SET NULL,
  content_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instagram_account_id, instagram_sender_id)
);

CREATE INDEX IF NOT EXISTS idx_pending_dm_content_lookup
  ON public.pending_dm_content (instagram_account_id, instagram_sender_id);

ALTER TABLE public.pending_dm_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pending_dm_content"
  ON public.pending_dm_content FOR ALL USING (auth.uid() = user_id);

-- Service role (webhook) bypasses RLS
