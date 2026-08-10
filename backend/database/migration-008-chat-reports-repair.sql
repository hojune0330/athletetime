DO $$
DECLARE
  schema_name TEXT := current_schema();
  reports_table REGCLASS;
  chat_columns_valid BOOLEAN;
  chat_constraints_valid BOOLEAN;
  chat_sequence_valid BOOLEAN;
  target_index_valid BOOLEAN;
  created_index_valid BOOLEAN;
  id_sequence REGCLASS;
  expected_chat_check TEXT := 'check(((target_type)::text=any((array[''post''::charactervarying,''comment''::charactervarying,''chat''::charactervarying])::text[])))';
BEGIN
  reports_table := to_regclass(format('%I.%I', schema_name, 'reports'));

  IF reports_table IS NULL THEN
    IF to_regclass(format('%I.%I', schema_name, 'reports_pkey')) IS NOT NULL
       OR to_regclass(format('%I.%I', schema_name, 'reports_id_seq')) IS NOT NULL THEN
      RAISE EXCEPTION 'Orphaned reports object exists; refusing to repair it';
    END IF;

    EXECUTE format(
      'CREATE TABLE %I.%I (
        id BIGSERIAL PRIMARY KEY,
        target_type VARCHAR(16) NOT NULL CHECK (target_type IN (''post'', ''comment'', ''chat'')),
        target_id VARCHAR(64) NOT NULL,
        reporter_anonymous_id VARCHAR(255) NOT NULL,
        reason_code VARCHAR(32) NOT NULL,
        detail TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (target_type, target_id, reporter_anonymous_id)
      )',
      schema_name,
      'reports'
    );
    reports_table := to_regclass(format('%I.%I', schema_name, 'reports'));
  END IF;

  SELECT COUNT(*) = 7
     AND COUNT(*) FILTER (WHERE column_name = 'id' AND data_type = 'bigint'
       AND is_nullable = 'NO' AND column_default IS NOT NULL) = 1
     AND COUNT(*) FILTER (WHERE column_name = 'target_type' AND data_type = 'character varying'
       AND character_maximum_length = 16 AND is_nullable = 'NO') = 1
     AND COUNT(*) FILTER (WHERE column_name = 'target_id' AND data_type = 'character varying'
       AND character_maximum_length = 64 AND is_nullable = 'NO') = 1
     AND COUNT(*) FILTER (WHERE column_name = 'reporter_anonymous_id' AND data_type = 'character varying'
       AND character_maximum_length = 255 AND is_nullable = 'NO') = 1
     AND COUNT(*) FILTER (WHERE column_name = 'reason_code' AND data_type = 'character varying'
       AND character_maximum_length = 32 AND is_nullable = 'NO') = 1
     AND COUNT(*) FILTER (WHERE column_name = 'detail' AND data_type = 'text'
       AND is_nullable = 'YES') = 1
     AND COUNT(*) FILTER (WHERE column_name = 'created_at' AND data_type = 'timestamp with time zone'
       AND is_nullable = 'NO'
       AND regexp_replace(lower(column_default), '[[:space:]]+', '', 'g') IN ('now()', 'current_timestamp')) = 1
  INTO chat_columns_valid
  FROM information_schema.columns
  WHERE table_schema = schema_name
    AND table_name = 'reports';

  SELECT COUNT(*) = 3
     AND COUNT(*) FILTER (WHERE contype = 'p'
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'id' AND NOT attisdropped)]::SMALLINT[]) = 1
     AND COUNT(*) FILTER (WHERE contype = 'u'
       AND conkey = ARRAY[
         (SELECT attnum FROM pg_attribute WHERE attrelid = reports_table AND attname = 'target_type' AND NOT attisdropped),
         (SELECT attnum FROM pg_attribute WHERE attrelid = reports_table AND attname = 'target_id' AND NOT attisdropped),
         (SELECT attnum FROM pg_attribute WHERE attrelid = reports_table AND attname = 'reporter_anonymous_id' AND NOT attisdropped)
       ]::SMALLINT[]) = 1
     AND COUNT(*) FILTER (WHERE contype = 'c'
       AND conname = 'reports_target_type_check'
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'target_type' AND NOT attisdropped)]::SMALLINT[]
       AND regexp_replace(lower(pg_get_constraintdef(oid)), '[[:space:]]+', '', 'g') = expected_chat_check) = 1
  INTO chat_constraints_valid
  FROM pg_constraint
  WHERE conrelid = reports_table;

  id_sequence := pg_get_serial_sequence(format('%I.%I', schema_name, 'reports'), 'id')::REGCLASS;
  chat_sequence_valid := id_sequence IS NOT NULL
    AND id_sequence = to_regclass(format('%I.%I', schema_name, 'reports_id_seq'));

  IF NOT chat_columns_valid OR NOT chat_constraints_valid OR NOT chat_sequence_valid
     OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = reports_table AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Unrecognized reports table; refusing to repair it';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_index
    JOIN pg_class index_class ON index_class.oid = pg_index.indexrelid
    WHERE pg_index.indrelid = reports_table
      AND index_class.relname = 'reports_target_idx'
      AND regexp_replace(lower(pg_get_indexdef(index_class.oid)), '[[:space:]]+', '', 'g') =
        regexp_replace(lower(format(
          'CREATE INDEX %I ON %I.%I USING btree (%I, %I)',
          'reports_target_idx', schema_name, 'reports', 'target_type', 'target_id'
        )), '[[:space:]]+', '', 'g')
  ) INTO target_index_valid;

  IF to_regclass(format('%I.%I', schema_name, 'reports_target_idx')) IS NOT NULL
     AND NOT target_index_valid THEN
    RAISE EXCEPTION 'Unrecognized reports_target_idx; refusing to repair it';
  END IF;
  IF NOT target_index_valid THEN
    EXECUTE format('CREATE INDEX %I ON %I.%I (target_type, target_id)',
      'reports_target_idx', schema_name, 'reports');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_index
    JOIN pg_class index_class ON index_class.oid = pg_index.indexrelid
    WHERE pg_index.indrelid = reports_table
      AND index_class.relname = 'reports_created_idx'
      AND regexp_replace(lower(pg_get_indexdef(index_class.oid)), '[[:space:]]+', '', 'g') =
        regexp_replace(lower(format(
          'CREATE INDEX %I ON %I.%I USING btree (%I DESC)',
          'reports_created_idx', schema_name, 'reports', 'created_at'
        )), '[[:space:]]+', '', 'g')
  ) INTO created_index_valid;

  IF to_regclass(format('%I.%I', schema_name, 'reports_created_idx')) IS NOT NULL
     AND NOT created_index_valid THEN
    RAISE EXCEPTION 'Unrecognized reports_created_idx; refusing to repair it';
  END IF;
  IF NOT created_index_valid THEN
    EXECUTE format('CREATE INDEX %I ON %I.%I (created_at DESC)',
      'reports_created_idx', schema_name, 'reports');
  END IF;
END $$;
