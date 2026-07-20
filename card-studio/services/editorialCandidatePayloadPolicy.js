const crypto = require('node:crypto');

const RESTRICTED_NORMALIZED_KEYS = new Set([
  'address', 'articlebody', 'authorization', 'birthdata', 'birthdate', 'birthyear',
  'contact', 'cookie', 'email', 'fulltext', 'html', 'institutionidentifier',
  'personno', 'personno1', 'phone', 'privatestoragepath', 'rawarticle',
  'rawathletehistoryhtml', 'rawathletehistoryjson', 'rawhtml', 'rawsourcemarkup',
  'residentregistrationnumber', 'session', 'sessionid', 'sessionmaterial',
  'sourceathleteidentifier', 'sourcetoprecordidentifier',
]);

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function isRestrictedKey(key) {
  const normalized = key.replaceAll(/[^a-z0-9]/giu, '').toLowerCase();
  return RESTRICTED_NORMALIZED_KEYS.has(normalized);
}

function sanitizeFactPayload(value) {
  if (Array.isArray(value)) {
    const items = value.map(sanitizeFactPayload);
    return {
      value: items.map((item) => item.value),
      restricted: items.some((item) => item.restricted),
    };
  }
  if (value && typeof value === 'object') {
    let restricted = false;
    const entries = [];
    for (const key of Object.keys(value).sort()) {
      if (isRestrictedKey(key)) {
        restricted = true;
        continue;
      }
      const item = sanitizeFactPayload(value[key]);
      entries.push([key, item.value]);
      restricted ||= item.restricted;
    }
    return { value: Object.fromEntries(entries), restricted };
  }
  return { value, restricted: false };
}

function candidateFingerprint(fact) {
  const payload = sanitizeFactPayload(fact.factPayload || {}).value;
  const identity = canonicalValue({
    kind: fact.kind,
    competitionId: fact.competitionId || null,
    occurredAt: fact.occurredAt || null,
    factPayload: payload,
  });
  return crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

module.exports = { candidateFingerprint, sanitizeFactPayload };
