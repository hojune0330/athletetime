DROP TABLE IF EXISTS editorial_news_events;
DROP FUNCTION IF EXISTS prevent_editorial_news_event_mutation();
ALTER TABLE editorial_news_discoveries
  DROP CONSTRAINT IF EXISTS editorial_news_discoveries_first_seen_run_id_fkey;
DELETE FROM editorial_news_discoveries
  WHERE first_seen_run_id IS NULL;
ALTER TABLE editorial_news_discoveries
  ALTER COLUMN first_seen_run_id SET NOT NULL;
ALTER TABLE editorial_news_discoveries
  ADD CONSTRAINT editorial_news_discoveries_first_seen_run_id_fkey
  FOREIGN KEY (first_seen_run_id) REFERENCES editorial_news_runs(id) ON DELETE RESTRICT;
