ALTER TABLE data_requests
  ADD COLUMN IF NOT EXISTS retention_purged_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS data_requests_retention_due_idx
  ON data_requests (created_at)
  WHERE retention_purged_at IS NULL;
