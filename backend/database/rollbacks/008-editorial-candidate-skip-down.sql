DELETE FROM editorial_calendar_events WHERE event_type = 'skipped';

ALTER TABLE editorial_calendar_events
  DROP CONSTRAINT IF EXISTS editorial_calendar_events_event_type_check;

ALTER TABLE editorial_calendar_events
  ADD CONSTRAINT editorial_calendar_events_event_type_check
  CHECK (event_type IN ('created', 'updated', 'cancelled'));
