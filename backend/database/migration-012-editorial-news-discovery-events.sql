ALTER TABLE editorial_news_discoveries
  ALTER COLUMN first_seen_run_id DROP NOT NULL;
ALTER TABLE editorial_news_discoveries
  DROP CONSTRAINT IF EXISTS editorial_news_discoveries_first_seen_run_id_fkey;
ALTER TABLE editorial_news_discoveries
  ADD CONSTRAINT editorial_news_discoveries_first_seen_run_id_fkey
  FOREIGN KEY (first_seen_run_id) REFERENCES editorial_news_runs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS editorial_news_events (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID REFERENCES editorial_news_runs(id) ON DELETE CASCADE,
  discovery_id UUID,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('run_started', 'run_completed', 'status_changed', 'purged')),
  actor_user_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (event_type IN ('run_started', 'run_completed') AND run_id IS NOT NULL AND discovery_id IS NULL AND actor_user_id IS NOT NULL)
    OR (event_type = 'status_changed' AND run_id IS NULL AND discovery_id IS NOT NULL AND actor_user_id IS NOT NULL)
    OR (event_type = 'purged' AND run_id IS NULL AND discovery_id IS NULL AND actor_user_id IS NULL)
  ),
  CHECK (metadata::text !~* '(description|article|raw|credential|api_key|authorization|cookie|review_note)')
);

CREATE INDEX IF NOT EXISTS editorial_news_events_run_idx ON editorial_news_events (run_id, id);
CREATE INDEX IF NOT EXISTS editorial_news_events_discovery_idx ON editorial_news_events (discovery_id, id);

CREATE OR REPLACE FUNCTION prevent_editorial_news_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'editorial_news_events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER editorial_news_events_immutable
  BEFORE UPDATE ON editorial_news_events
  FOR EACH ROW EXECUTE FUNCTION prevent_editorial_news_event_mutation();
