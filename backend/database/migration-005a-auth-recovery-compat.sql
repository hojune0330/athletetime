DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'password_reset_codes'
      AND column_name = 'code'
  ) THEN
    ALTER TABLE password_reset_codes
      ALTER COLUMN code DROP NOT NULL;
  END IF;
END $$;
