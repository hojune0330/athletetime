ALTER TABLE editorial_issues ADD COLUMN IF NOT EXISTS slug VARCHAR(80);

UPDATE editorial_issues
SET slug = 'magazine-' || id::text
WHERE slug IS NULL;

ALTER TABLE editorial_issues ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'editorial_issues'::regclass
      AND conname = 'editorial_issues_slug_format_check'
  ) THEN
    ALTER TABLE editorial_issues
      ADD CONSTRAINT editorial_issues_slug_format_check
      CHECK (slug ~ '^magazine-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$');
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS editorial_issues_slug_uidx ON editorial_issues (slug);

CREATE TABLE IF NOT EXISTS editorial_calendar_events (
  id BIGSERIAL PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES editorial_calendar(id) ON DELETE RESTRICT,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('created', 'updated', 'cancelled')),
  calendar_version INTEGER NOT NULL CHECK (calendar_version > 0),
  actor_user_id UUID NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editorial_calendar_events_calendar_id_idx
  ON editorial_calendar_events (calendar_id, id);

ALTER TABLE editorial_events DROP CONSTRAINT IF EXISTS editorial_events_event_type_check;
ALTER TABLE editorial_events ADD CONSTRAINT editorial_events_event_type_check
  CHECK (event_type IN (
    'created', 'source_added', 'source_updated', 'source_deleted', 'revised',
    'rejected', 'cancelled', 'status_changed', 'published', 'quarantined'
  ));
