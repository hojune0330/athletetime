const REQUEST_REDACTION = Object.freeze({
  ticketHint: 'REDACTED',
  text: '[retention redacted]',
});

async function purgeExpiredData(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const due = await client.query(`
      SELECT id, contact_ciphertext IS NOT NULL AS had_contact
      FROM data_requests
      WHERE retention_purged_at IS NULL
        AND created_at <= NOW() - INTERVAL '3 years'
      FOR UPDATE
    `);
    const requestIds = due.rows.map((row) => row.id);

    const suppressions = await client.query(`
      DELETE FROM record_suppressions
      WHERE active = FALSE AND request_id = ANY($1::uuid[])
    `, [requestIds]);
    await client.query(`
      UPDATE data_request_events
      SET actor_user_id = NULL, note = $2
      WHERE request_id = ANY($1::uuid[])
    `, [requestIds, REQUEST_REDACTION.text]);
    const requests = await client.query(`
      UPDATE data_requests
      SET public_ticket_hash = md5('retained:' || id::text) || md5(id::text || ':retained'),
          ticket_hint = $2,
          athlete_name = $2,
          affiliation = '',
          competition = '',
          event = '',
          record_key = NULL,
          source_id = NULL,
          reason = $3,
          contact_ciphertext = NULL,
          contact_iv = NULL,
          contact_tag = NULL,
          contact_key_version = NULL,
          contact_purge_at = NULL,
          retention_purged_at = NOW(),
          updated_at = NOW()
      WHERE id = ANY($1::uuid[])
    `, [requestIds, REQUEST_REDACTION.ticketHint, REQUEST_REDACTION.text]);
    const contacts = await client.query(`
      UPDATE data_requests
      SET contact_ciphertext = NULL, contact_iv = NULL, contact_tag = NULL,
          contact_key_version = NULL
      WHERE contact_purge_at IS NOT NULL
        AND contact_purge_at <= NOW()
        AND contact_ciphertext IS NOT NULL
    `);
    const metrics = await client.query(`
      DELETE FROM search_metric_daily
      WHERE metric_date < CURRENT_DATE - INTERVAL '24 months'
    `);
    await client.query('COMMIT');

    return {
      requests: requests.rowCount,
      contacts: contacts.rowCount + due.rows.filter((row) => row.had_contact).length,
      metrics: metrics.rowCount,
      suppressions: suppressions.rowCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { purgeExpiredData };
