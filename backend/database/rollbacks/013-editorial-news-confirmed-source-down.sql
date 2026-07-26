ALTER TABLE editorial_news_discoveries
  DROP CONSTRAINT IF EXISTS editorial_news_discoveries_confirmed_source_metadata_check;
ALTER TABLE editorial_news_discoveries
  DROP COLUMN IF EXISTS confirmed_source_kind,
  DROP COLUMN IF EXISTS confirmed_source_publisher,
  DROP COLUMN IF EXISTS confirmed_source_title;
