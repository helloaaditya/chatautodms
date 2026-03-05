-- Store commenter's name so we can personalize the content message ("Hi Aditya Kumar!").
ALTER TABLE public.pending_dm_content
  ADD COLUMN IF NOT EXISTS sender_full_name TEXT;
