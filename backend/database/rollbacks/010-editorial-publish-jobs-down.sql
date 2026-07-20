DELETE FROM editorial_events WHERE event_type = 'rescheduled';

ALTER TABLE editorial_events
  DROP CONSTRAINT IF EXISTS editorial_events_event_type_check;

ALTER TABLE editorial_events
  ADD CONSTRAINT editorial_events_event_type_check
  CHECK (event_type IN (
    'created', 'source_added', 'source_updated', 'source_deleted', 'revised',
    'rejected', 'cancelled', 'status_changed', 'published', 'quarantined'
  ));

DROP TABLE IF EXISTS editorial_publish_jobs;
