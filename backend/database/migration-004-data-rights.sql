CREATE TABLE IF NOT EXISTS athletetime_migrations (
  name TEXT PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY,
  public_ticket_hash CHAR(64) UNIQUE NOT NULL,
  ticket_hint VARCHAR(8) NOT NULL,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('correction', 'deletion', 'objection')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'under_review', 'search_hidden', 'corrected', 'restored', 'removed')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  athlete_name VARCHAR(100) NOT NULL,
  affiliation VARCHAR(100) NOT NULL DEFAULT '',
  competition VARCHAR(200) NOT NULL DEFAULT '',
  event VARCHAR(120) NOT NULL DEFAULT '',
  record_key VARCHAR(200),
  source_id VARCHAR(200),
  reason TEXT NOT NULL,
  contact_ciphertext BYTEA,
  contact_iv BYTEA,
  contact_tag BYTEA,
  contact_key_version VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  contact_purge_at TIMESTAMPTZ,
  CHECK (
    (contact_ciphertext IS NULL AND contact_iv IS NULL AND contact_tag IS NULL)
    OR (contact_ciphertext IS NOT NULL AND contact_iv IS NOT NULL AND contact_tag IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS data_requests_status_created_idx
  ON data_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS data_request_events (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES data_requests(id) ON DELETE RESTRICT,
  actor_user_id UUID,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  request_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS data_request_events_request_idx
  ON data_request_events (request_id, id);

CREATE TABLE IF NOT EXISTS record_suppressions (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES data_requests(id) ON DELETE RESTRICT,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('mask', 'hide', 'remove')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  record_key VARCHAR(200),
  source_id VARCHAR(200),
  legacy_athlete_name VARCHAR(100),
  legacy_affiliation VARCHAR(100),
  legacy_competition VARCHAR(200),
  legacy_event VARCHAR(120),
  scope_kind VARCHAR(20) NOT NULL CHECK (scope_kind IN ('record_key', 'source_id', 'subject_tuple', 'legacy_tuple')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  CHECK (
    (scope_kind = 'record_key' AND record_key IS NOT NULL)
    OR (scope_kind = 'source_id' AND source_id IS NOT NULL)
    OR (scope_kind IN ('subject_tuple', 'legacy_tuple') AND legacy_athlete_name IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS record_suppressions_one_active_request_idx
  ON record_suppressions (request_id) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS record_suppressions_active_record_idx
  ON record_suppressions (record_key) WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS record_suppressions_active_source_idx
  ON record_suppressions (source_id) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS search_metric_daily (
  metric_date DATE NOT NULL,
  surface VARCHAR(30) NOT NULL CHECK (surface IN ('records', 'competitions', 'insights')),
  query_script VARCHAR(10) NOT NULL CHECK (query_script IN ('hangul', 'latin', 'numeric', 'mixed')),
  query_length_bucket VARCHAR(5) NOT NULL CHECK (query_length_bucket IN ('2-3', '4-6', '7-10', '11+')),
  count BIGINT NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (metric_date, surface, query_script, query_length_bucket)
);

CREATE TABLE IF NOT EXISTS data_rights_import_runs (
  id UUID PRIMARY KEY,
  source_kind VARCHAR(40) NOT NULL,
  source_checksum CHAR(64) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  source_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT NOT NULL DEFAULT '',
  UNIQUE (source_kind, source_checksum)
);
