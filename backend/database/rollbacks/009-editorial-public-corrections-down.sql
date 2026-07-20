ALTER TABLE editorial_revisions
  DROP CONSTRAINT IF EXISTS editorial_revisions_public_summary_check;

ALTER TABLE editorial_revisions
  DROP COLUMN IF EXISTS public_summary;
