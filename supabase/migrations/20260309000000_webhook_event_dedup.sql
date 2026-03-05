-- Deduplicate duplicate webhook deliveries (Instagram sometimes sends the same event twice).
CREATE TABLE IF NOT EXISTS public.webhook_event_dedup (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.webhook_event_dedup IS 'One processing per Instagram message/postback mid to avoid double-handling duplicate webhook POSTs.';

-- Optional: periodic cleanup of old rows to avoid table bloat (e.g. delete older than 7 days via cron or manual).
-- CREATE INDEX IF NOT EXISTS idx_webhook_event_dedup_created ON public.webhook_event_dedup (created_at);

ALTER TABLE public.webhook_event_dedup ENABLE ROW LEVEL SECURITY;
