CREATE TABLE IF NOT EXISTS editorial_calendar (
  id UUID PRIMARY KEY,
  season_year INTEGER NOT NULL CHECK (season_year BETWEEN 2000 AND 2200),
  competition_id BIGINT,
  package_role VARCHAR(20) CHECK (package_role IN ('preview', 'result_context', 'record_story')),
  section_key VARCHAR(80) NOT NULL,
  slot INTEGER NOT NULL CHECK (slot > 0),
  state VARCHAR(20) NOT NULL DEFAULT 'planned'
    CHECK (state IN ('planned', 'candidate_linked', 'drafting', 'ready', 'scheduled', 'published', 'skipped', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  skip_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (package_role IS NULL OR competition_id IS NOT NULL),
  CHECK (state <> 'skipped' OR NULLIF(BTRIM(skip_reason), '') IS NOT NULL),
  UNIQUE (season_year, section_key, slot)
);

CREATE UNIQUE INDEX IF NOT EXISTS editorial_calendar_competition_package_role_uidx
  ON editorial_calendar (competition_id, package_role)
  WHERE competition_id IS NOT NULL AND package_role IS NOT NULL;

CREATE TABLE IF NOT EXISTS editorial_issues (
  id UUID PRIMARY KEY,
  calendar_id UUID NOT NULL UNIQUE REFERENCES editorial_calendar(id) ON DELETE RESTRICT,
  post_id BIGINT UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review_ready', 'approved', 'scheduled', 'published', 'corrected', 'unpublished')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  title VARCHAR(200) NOT NULL CHECK (NULLIF(BTRIM(title), '') IS NOT NULL),
  content TEXT NOT NULL CHECK (NULLIF(BTRIM(content), '') IS NOT NULL),
  author VARCHAR(50) NOT NULL CHECK (NULLIF(BTRIM(author), '') IS NOT NULL),
  summary TEXT NOT NULL CHECK (NULLIF(BTRIM(summary), '') IS NOT NULL),
  why_now TEXT NOT NULL CHECK (NULLIF(BTRIM(why_now), '') IS NOT NULL),
  discussion_question TEXT NOT NULL CHECK (NULLIF(BTRIM(discussion_question), '') IS NOT NULL),
  related_url TEXT NOT NULL CHECK (NULLIF(BTRIM(related_url), '') IS NOT NULL),
  subject_age_group VARCHAR(10) NOT NULL CHECK (subject_age_group IN ('adult', 'minor', 'unknown')),
  created_by UUID NOT NULL,
  last_actor_user_id UUID NOT NULL,
  last_action_id UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  policy_checked_at TIMESTAMPTZ,
  policy_fingerprint CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status IN ('draft', 'review_ready', 'approved', 'scheduled') AND post_id IS NULL)
    OR (status IN ('published', 'corrected', 'unpublished') AND post_id IS NOT NULL)
  ),
  CHECK (
    status IN ('draft', 'review_ready')
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  ),
  CHECK (
    status = 'draft'
    OR status IN ('corrected', 'unpublished')
    OR (policy_checked_at IS NOT NULL AND policy_fingerprint ~ '^[a-f0-9]{64}$')
  )
);

CREATE INDEX IF NOT EXISTS editorial_issues_status_updated_idx
  ON editorial_issues (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS editorial_sources (
  id UUID PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES editorial_issues(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL CHECK (source_url ~ '^https://'),
  source_kind VARCHAR(20) NOT NULL CHECK (source_kind IN ('official', 'primary', 'secondary', 'internal')),
  title VARCHAR(300) NOT NULL CHECK (NULLIF(BTRIM(title), '') IS NOT NULL),
  publisher VARCHAR(200),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, source_url)
);

CREATE TABLE IF NOT EXISTS editorial_revisions (
  id BIGSERIAL PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES editorial_issues(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  review_note TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, revision_number)
);

CREATE TABLE IF NOT EXISTS editorial_events (
  id BIGSERIAL PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES editorial_issues(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL
    CHECK (event_type IN ('created', 'source_added', 'revised', 'status_changed', 'published', 'quarantined')),
  from_status VARCHAR(20)
    CHECK (from_status IS NULL OR from_status IN ('draft', 'review_ready', 'approved', 'scheduled', 'published', 'corrected', 'unpublished')),
  to_status VARCHAR(20)
    CHECK (to_status IS NULL OR to_status IN ('draft', 'review_ready', 'approved', 'scheduled', 'published', 'corrected', 'unpublished')),
  issue_version INTEGER NOT NULL CHECK (issue_version > 0),
  actor_user_id UUID NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS editorial_events_issue_id_idx
  ON editorial_events (issue_id, id);

CREATE TABLE IF NOT EXISTS magazine_digest_preferences (
  user_id UUID PRIMARY KEY,
  cadence VARCHAR(10) NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly', 'off')),
  section_keys JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(section_keys) = 'array'),
  delivery_hour_utc SMALLINT NOT NULL DEFAULT 0 CHECK (delivery_hour_utc BETWEEN 0 AND 23),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_alert_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  competition_id BIGINT,
  section_key VARCHAR(80) NOT NULL,
  channel VARCHAR(10) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email')),
  lead_minutes INTEGER NOT NULL DEFAULT 60 CHECK (lead_minutes BETWEEN 0 AND 10080),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, section_key, channel)
);

CREATE TABLE IF NOT EXISTS issue_engagement_daily (
  issue_id UUID NOT NULL REFERENCES editorial_issues(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  views BIGINT NOT NULL DEFAULT 0 CHECK (views >= 0),
  likes BIGINT NOT NULL DEFAULT 0 CHECK (likes >= 0),
  comments BIGINT NOT NULL DEFAULT 0 CHECK (comments >= 0),
  shares BIGINT NOT NULL DEFAULT 0 CHECK (shares >= 0),
  PRIMARY KEY (issue_id, metric_date)
);

CREATE TABLE IF NOT EXISTS post_quarantines (
  id UUID PRIMARY KEY,
  post_id BIGINT NOT NULL,
  issue_id UUID REFERENCES editorial_issues(id) ON DELETE SET NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  reason_code VARCHAR(40) NOT NULL,
  reason_detail TEXT NOT NULL DEFAULT '',
  quarantined_by UUID NOT NULL,
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_by UUID,
  released_at TIMESTAMPTZ,
  CHECK (
    (status = 'active' AND released_at IS NULL AND released_by IS NULL)
    OR (status = 'released' AND released_at IS NOT NULL AND released_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS post_quarantines_one_active_post_uidx
  ON post_quarantines (post_id) WHERE status = 'active';

CREATE OR REPLACE FUNCTION enforce_editorial_issue_transition() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status <> 'draft' THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_EDITORIAL_TRANSITION', ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'draft' AND NEW.status = 'review_ready')
    OR (OLD.status = 'review_ready' AND NEW.status = 'approved')
    OR (OLD.status = 'approved' AND NEW.status IN ('scheduled', 'published'))
    OR (OLD.status = 'scheduled' AND NEW.status = 'published')
    OR (OLD.status = 'published' AND NEW.status IN ('corrected', 'unpublished'))
    OR (OLD.status = 'corrected' AND NEW.status IN ('published', 'unpublished'))
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_EDITORIAL_TRANSITION', ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
    AND NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_EDITORIAL_VERSION_STEP', ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
    AND NEW.last_action_id IS NOT DISTINCT FROM OLD.last_action_id THEN
    RAISE EXCEPTION USING MESSAGE = 'EDITORIAL_ACTION_CONTEXT_REQUIRED', ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editorial_issues_transition_guard ON editorial_issues;
CREATE TRIGGER editorial_issues_transition_guard
  BEFORE INSERT OR UPDATE ON editorial_issues
  FOR EACH ROW EXECUTE FUNCTION enforce_editorial_issue_transition();

CREATE OR REPLACE FUNCTION enforce_editorial_calendar_transition() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state AND NOT (
    (OLD.state = 'planned' AND NEW.state IN ('candidate_linked', 'drafting', 'skipped', 'cancelled'))
    OR (OLD.state = 'candidate_linked' AND NEW.state IN ('drafting', 'skipped', 'cancelled'))
    OR (OLD.state = 'drafting' AND NEW.state IN ('ready', 'skipped', 'cancelled'))
    OR (OLD.state = 'ready' AND NEW.state IN ('scheduled', 'published', 'skipped', 'cancelled'))
    OR (OLD.state = 'scheduled' AND NEW.state IN ('published', 'cancelled'))
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INVALID_EDITORIAL_CALENDAR_TRANSITION', ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editorial_calendar_transition_guard ON editorial_calendar;
CREATE TRIGGER editorial_calendar_transition_guard
  BEFORE UPDATE ON editorial_calendar
  FOR EACH ROW EXECUTE FUNCTION enforce_editorial_calendar_transition();

CREATE OR REPLACE FUNCTION audit_editorial_issue_transition() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO editorial_events (
      issue_id, event_type, from_status, to_status, issue_version, actor_user_id
    ) VALUES (NEW.id, 'created', NULL, NEW.status, NEW.version, NEW.last_actor_user_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO editorial_events (
      issue_id, event_type, from_status, to_status, issue_version, actor_user_id
    ) VALUES (
      NEW.id,
      CASE WHEN NEW.status = 'published' THEN 'published' ELSE 'status_changed' END,
      OLD.status,
      NEW.status,
      NEW.version,
      NEW.last_actor_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS editorial_issues_audit ON editorial_issues;
CREATE TRIGGER editorial_issues_audit
  AFTER INSERT OR UPDATE ON editorial_issues
  FOR EACH ROW EXECUTE FUNCTION audit_editorial_issue_transition();
