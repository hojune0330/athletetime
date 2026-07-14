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
  let strongest = null;

  for (const suppression of suppressions) {
    const keyMatch = suppression.recordKey && suppression.recordKey === recordKey;
    const sourceMatch = suppression.sourceId && suppression.sourceId === normalized.sourceId;
    const tupleMatch = suppression.athleteName === normalized.name
      && (!suppression.affiliation || suppression.affiliation === normalized.affiliation)
      && (!suppression.competition || suppression.competition === normalized.competition)
      && (!suppression.event || suppression.event === normalized.event);
    if (!keyMatch && !sourceMatch && !tupleMatch) continue;
    const mode = safeMode(suppression.mode);
    if (!strongest || modePriority(mode) > modePriority(strongest)) strongest = mode;
  }
  return strongest;
}

function safeMode(mode) {
  return SUPPRESSION_MODES.includes(mode) ? mode : 'mask';
}

function modePriority(mode) {
  return { mask: 1, hide: 2, remove: 3 }[mode] || 1;
}

module.exports = { findSuppressionMode, freezeSuppressions };
