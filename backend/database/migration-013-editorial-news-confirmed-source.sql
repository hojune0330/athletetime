ALTER TABLE editorial_news_discoveries
  ADD COLUMN confirmed_source_title VARCHAR(300),
  ADD COLUMN confirmed_source_publisher VARCHAR(200),
  ADD COLUMN confirmed_source_kind VARCHAR(20);

ALTER TABLE editorial_news_discoveries
  ADD CONSTRAINT editorial_news_discoveries_confirmed_source_metadata_check CHECK (
    (status IN ('source_confirmed', 'calendar_linked') AND (
      confirmed_source_url IS NOT NULL
      AND NULLIF(BTRIM(confirmed_source_title), '') IS NOT NULL
      AND NULLIF(BTRIM(confirmed_source_publisher), '') IS NOT NULL
      AND confirmed_source_kind IN ('official', 'primary', 'secondary')
    ))
    OR (status IN ('discovered', 'reviewing', 'dismissed', 'expired') AND confirmed_source_url IS NULL
      AND confirmed_source_title IS NULL AND confirmed_source_publisher IS NULL AND confirmed_source_kind IS NULL)
  );
