const { buildRecordKey } = require('./dataRightsCrypto');
const { sanitize } = require('./dataRequestValidation');

const SUPPRESSION_MODES = ['mask', 'hide', 'remove'];

function freezeSuppressions(rows) {
  return Object.freeze(rows.map((row) => Object.freeze({ ...row })));
}

function findSuppressionMode(suppressions, input = {}) {
  const normalized = {
    recordKey: sanitize(input.recordKey, 200),
    sourceId: sanitize(input.sourceId, 200),
    name: sanitize(input.name, 100),
    affiliation: sanitize(input.affiliation, 100),
    competition: sanitize(input.competition, 200),
    event: sanitize(input.event, 120),
  };
  const recordKey = normalized.recordKey || buildRecordKey(normalized);

  for (const suppression of suppressions) {
    if (suppression.recordKey && suppression.recordKey === recordKey) return safeMode(suppression.mode);
    if (suppression.sourceId && suppression.sourceId === normalized.sourceId) return safeMode(suppression.mode);
    if (!suppression.athleteName || suppression.athleteName !== normalized.name) continue;
    if (suppression.affiliation && suppression.affiliation !== normalized.affiliation) continue;
    if (suppression.competition && suppression.competition !== normalized.competition) continue;
    if (suppression.event && suppression.event !== normalized.event) continue;
    return safeMode(suppression.mode);
  }
  return null;
}

function safeMode(mode) {
  return SUPPRESSION_MODES.includes(mode) ? mode : 'mask';
}

module.exports = { findSuppressionMode, freezeSuppressions };
