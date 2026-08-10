DO $$
DECLARE
  schema_name TEXT := current_schema();
  reports_table REGCLASS;
  legacy_table REGCLASS;
  legacy_columns_valid BOOLEAN;
  legacy_constraints_valid BOOLEAN;
  legacy_indexes_valid BOOLEAN;
  chat_columns_valid BOOLEAN;
  chat_constraints_valid BOOLEAN;
  chat_sequence_valid BOOLEAN;
  legacy_triggers_valid BOOLEAN;
  id_sequence REGCLASS;
  expected_chat_check TEXT := 'check(((target_type)::text=any((array[''post''::charactervarying,''comment''::charactervarying,''chat''::charactervarying])::text[])))';
  expected_legacy_status_check TEXT := 'check(((status)::text=any((array[''pending''::charactervarying,''reviewed''::charactervarying,''resolved''::charactervarying,''rejected''::charactervarying])::text[])))';
BEGIN
  reports_table := to_regclass(format('%I.%I', schema_name, 'reports'));
  IF reports_table IS NULL THEN
    RETURN;
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

  IF chat_columns_valid AND chat_constraints_valid AND chat_sequence_valid
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = reports_table AND NOT tgisinternal) THEN
    RETURN;
  END IF;

  SELECT COUNT(*) = 10
     AND COUNT(*) FILTER (WHERE column_name = 'id' AND data_type = 'bigint'
       AND is_nullable = 'NO' AND column_default IS NOT NULL) = 1
     AND COUNT(*) FILTER (WHERE column_name IN ('post_id', 'comment_id') AND data_type = 'bigint'
       AND is_nullable = 'YES' AND column_default IS NULL) = 2
     AND COUNT(*) FILTER (WHERE column_name = 'user_id' AND data_type = 'uuid'
       AND is_nullable = 'YES' AND column_default IS NULL) = 1
     AND COUNT(*) FILTER (WHERE column_name = 'reason' AND data_type = 'character varying'
       AND character_maximum_length = 50 AND is_nullable = 'NO' AND column_default IS NULL) = 1
     AND COUNT(*) FILTER (WHERE column_name IN ('description', 'admin_note') AND data_type = 'text'
       AND is_nullable = 'YES' AND column_default IS NULL) = 2
     AND COUNT(*) FILTER (WHERE column_name = 'status' AND data_type = 'character varying'
       AND character_maximum_length = 20 AND is_nullable = 'YES'
       AND regexp_replace(lower(column_default), '[[:space:]]+', '', 'g') = '''pending''::charactervarying') = 1
     AND COUNT(*) FILTER (WHERE column_name = 'created_at' AND data_type = 'timestamp with time zone'
       AND is_nullable = 'YES'
       AND regexp_replace(lower(column_default), '[[:space:]]+', '', 'g') IN ('now()', 'current_timestamp')) = 1
     AND COUNT(*) FILTER (WHERE column_name = 'reviewed_at' AND data_type = 'timestamp with time zone'
       AND is_nullable = 'YES' AND column_default IS NULL) = 1
  INTO legacy_columns_valid
  FROM information_schema.columns
  WHERE table_schema = schema_name
    AND table_name = 'reports';

  IF NOT legacy_columns_valid THEN
    RAISE EXCEPTION 'Unrecognized reports table; refusing to replace it';
  END IF;

  SELECT COUNT(*) = 5
     AND COUNT(*) FILTER (WHERE contype = 'p' AND conname = 'reports_pkey'
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'id' AND NOT attisdropped)]::SMALLINT[]) = 1
     AND COUNT(*) FILTER (WHERE contype = 'f' AND conname = 'reports_post_id_fkey'
       AND confrelid = to_regclass(format('%I.%I', schema_name, 'posts'))
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'post_id' AND NOT attisdropped)]::SMALLINT[]
       AND confkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = to_regclass(format('%I.%I', schema_name, 'posts')) AND attname = 'id' AND NOT attisdropped)]::SMALLINT[]
       AND confdeltype = 'c') = 1
     AND COUNT(*) FILTER (WHERE contype = 'f' AND conname = 'reports_comment_id_fkey'
       AND confrelid = to_regclass(format('%I.%I', schema_name, 'comments'))
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'comment_id' AND NOT attisdropped)]::SMALLINT[]
       AND confkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = to_regclass(format('%I.%I', schema_name, 'comments')) AND attname = 'id' AND NOT attisdropped)]::SMALLINT[]
       AND confdeltype = 'c') = 1
     AND COUNT(*) FILTER (WHERE contype = 'f' AND conname = 'reports_user_id_fkey'
       AND confrelid = to_regclass(format('%I.%I', schema_name, 'users'))
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'user_id' AND NOT attisdropped)]::SMALLINT[]
       AND confkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = to_regclass(format('%I.%I', schema_name, 'users')) AND attname = 'id' AND NOT attisdropped)]::SMALLINT[]
       AND confdeltype = 'c') = 1
     AND COUNT(*) FILTER (WHERE contype = 'c' AND conname = 'reports_status_check'
       AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
         WHERE attrelid = reports_table AND attname = 'status' AND NOT attisdropped)]::SMALLINT[]
       AND regexp_replace(lower(pg_get_constraintdef(oid)), '[[:space:]]+', '', 'g') = expected_legacy_status_check) = 1
  INTO legacy_constraints_valid
  FROM pg_constraint
  WHERE conrelid = reports_table;

  IF NOT legacy_constraints_valid THEN
    RAISE EXCEPTION 'Unrecognized reports constraints; refusing to replace it';
  END IF;

  SELECT COUNT(*) = 4
     AND COUNT(*) FILTER (WHERE index_name = 'idx_reports_post_id'
       AND regexp_replace(lower(index_definition), '[[:space:]]+', '', 'g') =
         regexp_replace(lower(format(
           'CREATE INDEX %I ON %I.%I USING btree (%I)',
           'idx_reports_post_id', schema_name, 'reports', 'post_id'
         )), '[[:space:]]+', '', 'g')) = 1
     AND COUNT(*) FILTER (WHERE index_name = 'idx_reports_comment_id'
       AND regexp_replace(lower(index_definition), '[[:space:]]+', '', 'g') =
         regexp_replace(lower(format(
           'CREATE INDEX %I ON %I.%I USING btree (%I)',
           'idx_reports_comment_id', schema_name, 'reports', 'comment_id'
         )), '[[:space:]]+', '', 'g')) = 1
     AND COUNT(*) FILTER (WHERE index_name = 'idx_reports_user_id'
       AND regexp_replace(lower(index_definition), '[[:space:]]+', '', 'g') =
         regexp_replace(lower(format(
           'CREATE INDEX %I ON %I.%I USING btree (%I)',
           'idx_reports_user_id', schema_name, 'reports', 'user_id'
         )), '[[:space:]]+', '', 'g')) = 1
     AND COUNT(*) FILTER (WHERE index_name = 'idx_reports_status'
       AND regexp_replace(lower(index_definition), '[[:space:]]+', '', 'g') =
         regexp_replace(lower(format(
           'CREATE INDEX %I ON %I.%I USING btree (%I)',
           'idx_reports_status', schema_name, 'reports', 'status'
         )), '[[:space:]]+', '', 'g')) = 1
  INTO legacy_indexes_valid
  FROM (
    SELECT index_class.relname AS index_name,
           pg_get_indexdef(index_class.oid) AS index_definition
    FROM pg_index
    JOIN pg_class index_class ON index_class.oid = pg_index.indexrelid
    WHERE pg_index.indrelid = reports_table
      AND NOT pg_index.indisprimary
  ) AS legacy_indexes;

  SELECT COUNT(*) = 1
     AND COUNT(*) FILTER (WHERE tgname = 'reports_count_trigger'
       AND regexp_replace(lower(pg_get_triggerdef(oid)), '[[:space:]]+', '', 'g') =
         'createtriggerreports_count_triggerafterinserton'
         || lower(format('%I.%I', schema_name, 'reports'))
         || 'foreachrowexecutefunctionupdate_reports_count()') = 1
  INTO legacy_triggers_valid
  FROM pg_trigger
  WHERE tgrelid = reports_table
    AND NOT tgisinternal;

  IF NOT legacy_indexes_valid OR NOT legacy_triggers_valid THEN
    RAISE EXCEPTION 'Unrecognized reports indexes or triggers; refusing to replace it';
  END IF;

  id_sequence := pg_get_serial_sequence(format('%I.%I', schema_name, 'reports'), 'id')::REGCLASS;
  IF id_sequence IS NULL
     OR id_sequence <> to_regclass(format('%I.%I', schema_name, 'reports_id_seq')) THEN
    RAISE EXCEPTION 'Unrecognized reports sequence; refusing to replace it';
  END IF;

  legacy_table := to_regclass(format('%I.%I', schema_name, 'legacy_community_reports'));
  IF legacy_table IS NOT NULL
     OR to_regclass(format('%I.%I', schema_name, 'legacy_community_reports_pkey')) IS NOT NULL
     OR to_regclass(format('%I.%I', schema_name, 'legacy_community_reports_id_seq')) IS NOT NULL THEN
    RAISE EXCEPTION 'legacy report object already exists; refusing to overwrite preserved reports';
  END IF;

  EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', schema_name, 'reports', 'legacy_community_reports');
  EXECUTE format(
    'ALTER TABLE %I.%I RENAME CONSTRAINT %I TO %I',
    schema_name,
    'legacy_community_reports',
    'reports_pkey',
    'legacy_community_reports_pkey'
  );
  EXECUTE format(
    'ALTER SEQUENCE %I.%I RENAME TO %I',
    schema_name,
    'reports_id_seq',
    'legacy_community_reports_id_seq'
  );
END $$;
