DROP TABLE IF EXISTS editorial_calendar_events;
DROP INDEX IF EXISTS editorial_issues_slug_uidx;
ALTER TABLE editorial_issues DROP CONSTRAINT IF EXISTS editorial_issues_slug_format_check;
ALTER TABLE editorial_issues DROP COLUMN IF EXISTS slug;
ALTER TABLE editorial_events DROP CONSTRAINT IF EXISTS editorial_events_event_type_check;
ALTER TABLE editorial_events ADD CONSTRAINT editorial_events_event_type_check
  CHECK (event_type IN ('created', 'source_added', 'revised', 'status_changed', 'published', 'quarantined'));
