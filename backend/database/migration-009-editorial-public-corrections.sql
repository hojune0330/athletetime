ALTER TABLE editorial_revisions
  ADD COLUMN IF NOT EXISTS public_summary VARCHAR(300);

ALTER TABLE editorial_revisions
  DROP CONSTRAINT IF EXISTS editorial_revisions_public_summary_check;

ALTER TABLE editorial_revisions
  ADD CONSTRAINT editorial_revisions_public_summary_check CHECK (
    public_summary IS NULL
    OR (
      NULLIF(BTRIM(public_summary), '') IS NOT NULL
      AND char_length(public_summary) <= 300
      AND public_summary !~ '[[:cntrl:]]'
    )
  );
