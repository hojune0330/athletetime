CREATE TABLE IF NOT EXISTS editorial_news_runs (
  id UUID PRIMARY KEY,
  run_date_kst DATE NOT NULL,
  profile_version VARCHAR(40) NOT NULL,
  trigger VARCHAR(12) NOT NULL CHECK (trigger IN ('manual', 'scheduled')),
  status VARCHAR(12) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  api_call_count INTEGER NOT NULL DEFAULT 0 CHECK (api_call_count >= 0),
  result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  inserted_count INTEGER NOT NULL DEFAULT 0 CHECK (inserted_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  irrelevant_count INTEGER NOT NULL DEFAULT 0 CHECK (irrelevant_count >= 0),
  safe_error_code VARCHAR(60),
  actor_user_id UUID,
  UNIQUE (run_date_kst, profile_version),
  CHECK (profile_version ~ '^[a-z0-9][a-z0-9._-]{0,39}$'),
  CHECK (
    (status = 'running' AND completed_at IS NULL AND safe_error_code IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND safe_error_code IS NULL)
    OR (status = 'failed' AND completed_at IS NOT NULL AND safe_error_code IS NOT NULL)
  ),
  CHECK (
    (trigger = 'manual' AND actor_user_id IS NOT NULL)
    OR (trigger = 'scheduled' AND actor_user_id IS NULL)
  ),
  CHECK (safe_error_code IS NULL OR safe_error_code ~ '^[a-z0-9_]{1,60}$')
);

CREATE TABLE IF NOT EXISTS editorial_news_discoveries (
  id UUID PRIMARY KEY,
  canonical_url_hash CHAR(64) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  naver_url TEXT,
  title VARCHAR(300) NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_seen_run_id UUID NOT NULL REFERENCES editorial_news_runs(id) ON DELETE RESTRICT,
  query_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  relevance_score SMALLINT NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
  relevance_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject_age_group VARCHAR(10) NOT NULL DEFAULT 'unknown'
    CHECK (subject_age_group IN ('adult', 'minor', 'unknown')),
  status VARCHAR(20) NOT NULL DEFAULT 'discovered'
    CHECK (status IN ('discovered', 'reviewing', 'source_confirmed', 'calendar_linked', 'dismissed', 'expired')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note VARCHAR(1000),
  confirmed_source_url TEXT,
  linked_calendar_id UUID REFERENCES editorial_calendar(id) ON DELETE RESTRICT,
  CHECK (canonical_url_hash ~ '^[0-9a-f]{64}$'),
  CHECK (char_length(original_url) <= 2048 AND original_url ~ '^https://'),
  CHECK (naver_url IS NULL OR (char_length(naver_url) <= 2048 AND naver_url ~ '^https://')),
  CHECK (
    NULLIF(BTRIM(title), '') IS NOT NULL
    AND title !~ '[[:cntrl:]]'
  ),
  CHECK (last_seen_at >= first_seen_at),
  CHECK (jsonb_typeof(query_keys) = 'array'),
  CHECK (jsonb_typeof(relevance_tags) = 'array'),
  CHECK (
    review_note IS NULL
    OR (
      NULLIF(BTRIM(review_note), '') IS NOT NULL
      AND review_note !~ '[[:cntrl:]]'
    )
  ),
  CHECK (
    confirmed_source_url IS NULL
    OR (
      char_length(confirmed_source_url) <= 2048
      AND confirmed_source_url ~ '^https://'
    )
  ),
  CHECK (
    (status IN ('discovered', 'expired')
      AND reviewed_by IS NULL
      AND reviewed_at IS NULL
      AND confirmed_source_url IS NULL
      AND linked_calendar_id IS NULL)
    OR (status = 'reviewing'
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND confirmed_source_url IS NULL
      AND linked_calendar_id IS NULL)
    OR (status = 'source_confirmed'
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND confirmed_source_url IS NOT NULL
      AND linked_calendar_id IS NULL)
    OR (status = 'calendar_linked'
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND confirmed_source_url IS NOT NULL
      AND linked_calendar_id IS NOT NULL)
    OR (status = 'dismissed'
      AND reviewed_by IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND review_note IS NOT NULL
      AND confirmed_source_url IS NULL
      AND linked_calendar_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS editorial_news_discoveries_status_published_idx
  ON editorial_news_discoveries (status, published_at DESC, id);

CREATE INDEX IF NOT EXISTS editorial_news_discoveries_last_seen_idx
  ON editorial_news_discoveries (last_seen_at, id)
  WHERE status IN ('dismissed', 'expired');

CREATE UNIQUE INDEX IF NOT EXISTS editorial_news_discoveries_calendar_uidx
  ON editorial_news_discoveries (linked_calendar_id)
  WHERE linked_calendar_id IS NOT NULL;
