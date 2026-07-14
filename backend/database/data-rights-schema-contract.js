const CONTRACTS = Object.freeze({
  'migration-004-data-rights.sql': Object.freeze({
    data_requests: Object.freeze([
      'id', 'public_ticket_hash', 'ticket_hint', 'request_type', 'status', 'version',
      'athlete_name', 'affiliation', 'competition', 'event', 'record_key', 'source_id',
      'reason', 'contact_ciphertext', 'contact_iv', 'contact_tag', 'contact_key_version',
      'created_at', 'updated_at', 'closed_at', 'contact_purge_at',
    ]),
    data_request_events: Object.freeze([
      'id', 'request_id', 'actor_user_id', 'from_status', 'to_status', 'note',
      'request_version', 'created_at',
    ]),
    record_suppressions: Object.freeze([
      'id', 'request_id', 'mode', 'active', 'version', 'record_key', 'source_id',
      'legacy_athlete_name', 'legacy_affiliation', 'legacy_competition', 'legacy_event',
      'scope_kind', 'started_at', 'ended_at',
    ]),
    search_metric_daily: Object.freeze([
      'metric_date', 'surface', 'query_script', 'query_length_bucket', 'count',
    ]),
    data_rights_import_runs: Object.freeze([
      'id', 'source_kind', 'source_checksum', 'started_at', 'completed_at',
      'source_count', 'imported_count', 'error_summary',
    ]),
  }),
  'migration-005-data-rights-retention.sql': Object.freeze({
    data_requests: Object.freeze(['retention_purged_at']),
  }),
});

async function validateDataRightsSchemaContract(client, migrationName) {
  const contract = CONTRACTS[migrationName];
  if (!contract) return;

  const tableNames = Object.keys(contract);
  const result = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = ANY($1::text[])
  `, [tableNames]);
  const actual = new Set(result.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missing = tableNames.flatMap((tableName) => contract[tableName]
    .map((columnName) => `${tableName}.${columnName}`)
    .filter((qualifiedName) => !actual.has(qualifiedName)));

  if (missing.length > 0) {
    throw new Error(
      `Data-rights schema contract violation after ${migrationName}; missing columns: ${missing.join(', ')}`,
    );
  }
}

module.exports = { validateDataRightsSchemaContract };
