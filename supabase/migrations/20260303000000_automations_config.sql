-- Store flow setup (post selection, message, toggles) for each automation
ALTER TABLE public.automations
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

COMMENT ON COLUMN public.automations.config IS 'Flow setup: templateId, postMode, selectedPostId, message, openingMessage, publicReply, askToFollow, followUp, etc.';
