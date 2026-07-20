CREATE TABLE IF NOT EXISTS editorial_publish_jobs (
  id UUID PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES editorial_issues(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'retrying', 'failed', 'completed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  next_attempt_at TIMESTAMPTZ,
  last_error_code VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id),
  CHECK (status <> 'queued' OR attempt_count = 0),
  CHECK (status <> 'retrying' OR attempt_count BETWEEN 1 AND 2),
  CHECK (status NOT IN ('failed', 'completed') OR attempt_count BETWEEN 1 AND 3),
  CHECK (
    (status IN ('queued', 'retrying') AND next_attempt_at IS NOT NULL)
    OR (status IN ('failed', 'completed') AND next_attempt_at IS NULL)
  ),
  CHECK (
    (status IN ('retrying', 'failed') AND last_error_code IS NOT NULL)
    OR (status IN ('queued', 'completed') AND last_error_code IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS editorial_publish_jobs_due_idx
  ON editorial_publish_jobs (next_attempt_at, created_at)
  WHERE status IN ('queued', 'retrying');

ALTER TABLE editorial_events
  DROP CONSTRAINT IF EXISTS editorial_events_event_type_check;

ALTER TABLE editorial_events
  ADD CONSTRAINT editorial_events_event_type_check
  CHECK (event_type IN (
    'created', 'source_added', 'source_updated', 'source_deleted', 'revised',
    'rejected', 'cancelled', 'status_changed', 'published', 'quarantined', 'rescheduled'
  ));
