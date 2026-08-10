DO $$
DECLARE
  is_legacy_reports BOOLEAN;
BEGIN
  IF to_regclass('reports') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'reports'
      AND column_name = 'target_type'
  ) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) = 4
  INTO is_legacy_reports
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'reports'
    AND column_name IN ('post_id', 'comment_id', 'user_id', 'reason');

  IF NOT is_legacy_reports THEN
    RAISE EXCEPTION 'Unrecognized reports table; refusing to replace it';
  END IF;

  IF to_regclass('legacy_community_reports') IS NOT NULL THEN
    RAISE EXCEPTION 'legacy_community_reports already exists; refusing to overwrite preserved reports';
  END IF;

  ALTER TABLE reports RENAME TO legacy_community_reports;
END $$;
