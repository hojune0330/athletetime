CREATE TABLE IF NOT EXISTS password_reset_codes (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(6),
  code_hash CHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE password_reset_codes
  ADD COLUMN IF NOT EXISTS code_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

UPDATE password_reset_codes
SET used = TRUE,
    code = NULL
WHERE used = FALSE
  AND code_hash IS NULL;

ALTER TABLE password_reset_codes
  ALTER COLUMN code DROP NOT NULL;

CREATE INDEX IF NOT EXISTS password_reset_codes_active_expiry_idx
  ON password_reset_codes (expires_at)
  WHERE used = FALSE;

CREATE TABLE IF NOT EXISTS email_verifications (
  email VARCHAR(255) PRIMARY KEY,
  code VARCHAR(6),
  code_hash CHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS code_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE email_verifications
  ALTER COLUMN code DROP NOT NULL;

UPDATE email_verifications
SET code = NULL,
    verified = FALSE,
    attempt_count = 0,
    locked_at = NULL
WHERE verified = FALSE
  AND code_hash IS NULL;

CREATE INDEX IF NOT EXISTS email_verifications_active_expiry_idx
  ON email_verifications (expires_at)
  WHERE verified = FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_code_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS verification_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_locked_at TIMESTAMPTZ;

UPDATE users
SET verification_code = NULL,
    verification_expires_at = NULL,
    verification_code_hash = NULL,
    verification_attempt_count = 0,
    verification_locked_at = NULL
WHERE email_verified = FALSE
  AND verification_code_hash IS NULL;
